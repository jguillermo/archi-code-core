'use strict';

const path = require('path');

const application = require(path.resolve(__dirname, '../../dist/cjs/application/index.js'));
const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));
const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));
const esmExceptionsUrl = path.resolve(__dirname, '../../dist/esm/exceptions/index.js');

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const OTHER_ORDER_ID = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    static eventName = 'OrderPlaced';

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
      'the in-memory repository saves, loads copies, checks versions and removes',
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
        await repository.remove(stored);
        const removed = await repository.findById(id);
        return (
          (first.customer.value === 'Ana' &&
            first !== second &&
            first.version === 2 &&
            stored.version === 2 &&
            conflict instanceof exceptions.ConcurrencyException &&
            removed === null) ||
          'unexpected in-memory repository behavior'
        );
      },
    ],
    [
      'events go through the in-memory channel and listeners receive them rebuilt from their JSON',
      async () => {
        const { Order, OrderPlaced } = orderModel();
        const received = [];
        class ConfirmOrderOnOrderPlaced extends application.EventListener {
          handle(event) {
            received.push(event);
          }
        }
        application.ListensTo(OrderPlaced, { consumer: 'confirm-order' })(
          ConfirmOrderOnOrderPlaced,
        );
        const channel = new m.InMemoryEventChannel();
        const registry = new m.EventRegistry().register(
          OrderPlaced,
          (json) => new OrderPlaced(json.aggregateId, json.customer, json),
        );
        const bus = new m.DomainEventBus(channel, registry);
        const subscription = await bus.subscribe(new ConfirmOrderOnOrderPlaced());
        const events = Order.place(ORDER_ID, 'Ana').pullDomainEvents();
        await bus.publish(events);
        await subscription.unsubscribe();
        await bus.publish(Order.place(OTHER_ORDER_ID, 'Luis').pullDomainEvents());
        return (
          (received.length === 1 &&
            received[0] instanceof OrderPlaced &&
            received[0] !== events[0] &&
            received[0].customer === 'Ana' &&
            received[0].eventId === events[0].eventId &&
            Object.isFrozen(received[0]) &&
            channel.sent.length === 2) ||
          'unexpected bus or channel result'
        );
      },
    ],
    [
      'the domain event bus sends JSON to its channel and hands listeners the rebuilt event',
      async () => {
        const { Order, OrderPlaced } = orderModel();
        const receivers = new Map();
        const consumers = [];
        const channel = {
          async send(events) {
            for (const event of events) {
              await receivers.get(event.eventName)?.(event);
            }
          },
          async receive(eventName, consumer, handler) {
            consumers.push(consumer);
            receivers.set(eventName, handler);
            return { close: async () => receivers.delete(eventName) };
          },
        };
        const received = [];
        class ConfirmOrderOnOrderPlaced extends application.EventListener {
          handle(event) {
            received.push(event);
          }
        }
        application.ListensTo(OrderPlaced, { consumer: 'confirm-order' })(
          ConfirmOrderOnOrderPlaced,
        );
        const registry = new m.EventRegistry().register(
          OrderPlaced,
          (json) => new OrderPlaced(json.aggregateId, json.customer, json),
        );
        const bus = new m.DomainEventBus(channel, registry);
        const subscription = await bus.subscribe(new ConfirmOrderOnOrderPlaced());
        const events = Order.place(ORDER_ID, 'Ana').pullDomainEvents();
        await bus.publish(events);
        await subscription.unsubscribe();
        return (
          (received.length === 1 &&
            received[0] instanceof OrderPlaced &&
            received[0].eventId === events[0].eventId &&
            consumers[0] === 'confirm-order' &&
            receivers.size === 0) ||
          `unexpected bus result: ${received.length}`
        );
      },
    ],
    [
      'the parallel channel runs every consumer and reports all failures together',
      async () => {
        const channel = new m.InMemoryEventChannel({ delivery: 'parallel' });
        const ran = [];
        await channel.receive('OrderPlaced', 'ReserveStockOnOrderPlaced', async () => {
          throw new Error('warehouse offline');
        });
        await channel.receive('OrderPlaced', 'ConfirmOrderOnOrderPlaced', async () => {
          ran.push('mail');
        });
        const { OrderPlaced } = orderModel();
        let failure = null;
        try {
          await channel.send([new OrderPlaced(ORDER_ID, 'Ana').toJSON()]);
        } catch (error) {
          failure = error;
        }
        return (
          (failure instanceof exceptions.EventDeliveryException &&
            failure.errors.length === 1 &&
            ran.join() === 'mail') ||
          `unexpected parallel delivery: ${failure}`
        );
      },
    ],
    [
      'the loggers write JSON lines, keep entries for tests and record a failing listener',
      async () => {
        const written = [];
        const original = console.warn;
        console.warn = (line) => written.push(JSON.parse(line));
        try {
          const clock = new m.FixedClock('2026-10-19T09:30:00Z');
          const logger = new m.ConsoleLogger({ level: 'warn', clock });
          logger.info('order_placed');
          logger.warn('stock_low', { sku: 'TORCH-01', at: clock.now() });
        } finally {
          console.warn = original;
        }
        const { OrderPlaced } = orderModel();
        class ReserveStockOnOrderPlaced extends application.EventListener {
          handle() {
            throw new Error('warehouse offline');
          }
        }
        application.ListensTo(OrderPlaced, { consumer: 'reserve-stock' })(
          ReserveStockOnOrderPlaced,
        );
        const memory = new m.InMemoryLogger();
        const bus = new m.DomainEventBus(
          new m.InMemoryEventChannel(),
          new m.EventRegistry().register(
            OrderPlaced,
            (json) => new OrderPlaced(json.aggregateId, json.customer, json),
          ),
          memory,
        );
        await bus.subscribe(new ReserveStockOnOrderPlaced());
        await bus.publish([new OrderPlaced(ORDER_ID, 'Ana')]).catch(() => undefined);
        const mapper = new m.HttpErrorMapper({ logger: memory });
        mapper.map(new Error('disk full'));
        new m.SilentLogger().error('ignored');
        const levels = memory.entries.map((entry) => `${entry.level}:${entry.message}`);
        return (
          (written.length === 1 &&
            written[0].level === 'warn' &&
            written[0].time === '2026-10-19T09:30:00.000Z' &&
            written[0].context.at === '2026-10-19T09:30:00.000Z' &&
            levels.join() ===
              'info:event_listener_subscribed,error:event_listener_failed,error:http_request_failed') ||
          `unexpected logging: ${JSON.stringify(written)} ${levels.join()}`
        );
      },
    ],
    [
      'errors map to HTTP without leaking internals, and clocks are injectable',
      () => {
        const mapper = new m.HttpErrorMapper();
        const notFound = mapper.map(new exceptions.AggregateNotFoundException('Order', ORDER_ID));
        const internal = mapper.map(new exceptions.InternalErrorException('password=secret'));
        const forbidden = mapper.map(new exceptions.NotAllowedException('cus-luis cannot cancel'));
        const rule = mapper.map(
          new exceptions.DomainException('Order already shipped', ['ORD001']),
        );
        const clock = new m.FixedClock('2026-01-01T00:00:00Z');
        clock.advance(1000);
        return (
          (notFound.status === 404 &&
            forbidden.status === 403 &&
            rule.status === 422 &&
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
