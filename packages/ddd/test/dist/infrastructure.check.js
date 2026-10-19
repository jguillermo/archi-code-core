'use strict';

const path = require('path');

const application = require(path.resolve(__dirname, '../../dist/cjs/application/index.js'));
const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));
const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));
const esmExceptionsUrl = path.resolve(__dirname, '../../dist/esm/exceptions/index.js');

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    static eventName = 'order.placed';

    constructor(id, customer, metadata) {
      super(id, metadata);
      this.customer = customer;
    }
  }
  class CustomerName extends domain.Required(domain.StringType) {}
  class Order extends domain.AggregateRoot {
    constructor(id, customer) {
      super(new domain.IdType(id));
      this.customer = new CustomerName(customer);
    }

    static place(id, customer) {
      const order = new Order(id, customer);
      order.record(new OrderPlaced(id, customer));
      return order;
    }

    static fromPrimitives(row) {
      return new Order(row.id, row.customer);
    }

    toPrimitives() {
      return { id: this.id.value, customer: this.customer.value };
    }
  }
  return { Order, OrderPlaced };
}

function smoke(m) {
  return [
    [
      'the aggregate mapper round-trips value objects and refuses raw state',
      () => {
        class CustomerName extends domain.Required(domain.StringType) {}
        class Order extends domain.AggregateRoot {
          constructor(id, customer) {
            super(new domain.IdType(id));
            this._customer = new CustomerName(customer);
          }

          static fromPrimitives(row) {
            return new Order(row.id, row.customer);
          }

          get customer() {
            return this._customer;
          }

          toPrimitives() {
            return { id: this.id.value, customer: this.customer.value };
          }
        }
        class Draft extends domain.AggregateRoot {
          constructor(id) {
            super(new domain.IdType(id));
            this._submitted = false;
          }

          static fromPrimitives(row) {
            return new Draft(row.id);
          }

          toPrimitives() {
            return { id: this.id.value, submitted: false };
          }
        }
        const mapper = m.AggregateMapper.of(Order);
        const stored = mapper.toPrimitives(new Order(ORDER_ID, 'Ana'));
        const loaded = mapper.fromPrimitives(stored);
        let refused = '';
        try {
          m.AggregateMapper.of(Draft).toPrimitives(new Draft(ORDER_ID));
        } catch (error) {
          refused = error.message;
        }
        return (
          (stored.customer === 'Ana' &&
            loaded.customer.value === 'Ana' &&
            refused ===
              'Failed, internal error: Draft._submitted is a boolean, not a value object') ||
          `unexpected mapper result: ${refused}`
        );
      },
    ],
    [
      'the in-memory repository saves, loads copies, checks versions and deletes',
      async () => {
        const { Order } = orderModel();
        const repository = new m.InMemoryRepository(m.AggregateMapper.of(Order));
        const id = new domain.IdType(ORDER_ID);
        await repository.save(Order.place(ORDER_ID, 'Ana'));
        const first = await repository.findById(id);
        const second = await repository.findById(id);
        await repository.save(first);
        let conflict = null;
        try {
          await repository.save(second);
        } catch (error) {
          conflict = error;
        }
        const stored = await repository.findById(id);
        await repository.delete(id);
        const deleted = await repository.findById(id);
        return (
          (first.customer.value === 'Ana' &&
            first !== second &&
            first.version === 2 &&
            stored.version === 2 &&
            conflict instanceof exceptions.ConcurrencyException &&
            deleted === null) ||
          'unexpected in-memory repository behavior'
        );
      },
    ],
    [
      'a transaction stores the order and its events, rolls both back on failure, and the relay delivers after commit',
      async () => {
        const { Order, OrderPlaced } = orderModel();
        const orders = new m.InMemoryRepository(m.AggregateMapper.of(Order));
        const outbox = new m.InMemoryOutbox();
        const transactions = new m.InMemoryTransactionRunner([orders, outbox]);
        const placeOrder = async (fail) =>
          transactions.run(async () => {
            const order = Order.place(ORDER_ID, 'Ana');
            await orders.save(order);
            await outbox.publish(order.pullDomainEvents());
            if (fail) {
              throw new Error('payment declined');
            }
          });
        let failed = false;
        try {
          await placeOrder(true);
        } catch {
          failed = true;
        }
        const afterRollback = (await orders.findAll()).length + (await outbox.pending(10)).length;
        await placeOrder(false);
        const received = [];
        class ConfirmOrderOnOrderPlaced extends application.EventListener {
          handle(event) {
            received.push(event.customer);
          }
        }
        application.ListensTo(OrderPlaced)(ConfirmOrderOnOrderPlaced);
        const dispatcher = new m.EventDispatcher([new ConfirmOrderOnOrderPlaced()]);
        const registry = new m.DomainEventRegistry().register(
          OrderPlaced,
          (json) => new OrderPlaced(json.aggregateId, json.customer, json),
        );
        const relay = new m.OutboxRelay(outbox, (json) =>
          dispatcher.dispatch(registry.fromJSON(json)),
        );
        const delivered = await relay.forward();
        return (
          (failed &&
            afterRollback === 0 &&
            transactions.committed === 1 &&
            transactions.rolledBack === 1 &&
            delivered === 1 &&
            received.join() === 'Ana' &&
            (await relay.forward()) === 0) ||
          'unexpected transaction or outbox behavior'
        );
      },
    ],
    [
      'events go through the bus and come back from their JSON',
      async () => {
        const { Order, OrderPlaced } = orderModel();
        const received = [];
        class ConfirmOrderOnOrderPlaced extends application.EventListener {
          handle(event) {
            received.push(event.customer);
          }
        }
        application.ListensTo(OrderPlaced)(ConfirmOrderOnOrderPlaced);
        const bus = new m.InMemoryEventBus(
          new m.EventDispatcher([new ConfirmOrderOnOrderPlaced()]),
        );
        const events = Order.place(ORDER_ID, 'Ana').pullDomainEvents();
        await bus.publish(events);
        const registry = new m.DomainEventRegistry().register(
          OrderPlaced,
          (json) => new OrderPlaced(json.aggregateId, json.customer, json),
        );
        const rebuilt = registry.fromJSON(JSON.stringify(events[0]));
        return (
          (received[0] === 'Ana' &&
            rebuilt instanceof OrderPlaced &&
            rebuilt.eventId === events[0].eventId &&
            bus.published.length === 1) ||
          'unexpected bus or registry result'
        );
      },
    ],
    [
      'errors map to HTTP without leaking internals, and clocks are injectable',
      () => {
        const mapper = new m.HttpErrorMapper();
        const notFound = mapper.map(new exceptions.AggregateNotFoundException('Order', ORDER_ID));
        const internal = mapper.map(new exceptions.InternalErrorException('password=secret'));
        const clock = new m.FixedClock('2026-01-01T00:00:00Z');
        clock.advance(1000);
        return (
          (notFound.status === 404 &&
            internal.status === 500 &&
            internal.body.message === 'Internal server error' &&
            clock.now().toISOString() === '2026-01-01T00:00:01.000Z' &&
            new m.SystemClock().now() instanceof Date) ||
          'unexpected mapping or clock'
        );
      },
    ],
  ];
}

function crossBuild(cjs) {
  return [
    [
      'the CJS mapper maps exceptions thrown by the ESM exceptions',
      async () => {
        const esmExceptions = await import(esmExceptionsUrl);
        const mapped = new cjs.HttpErrorMapper().map(
          new esmExceptions.ValidationException([
            { field: 'email', message: 'Email: Value does not satisfy isEmail' },
          ]),
        );
        return mapped.status === 422 || `unexpected status ${mapped.status}`;
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
