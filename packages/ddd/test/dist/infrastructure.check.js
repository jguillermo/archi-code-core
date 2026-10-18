'use strict';

const path = require('path');

const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));
const exceptions = require(path.resolve(__dirname, '../../dist/cjs/exceptions/index.js'));
const esmExceptionsUrl = path.resolve(__dirname, '../../dist/esm/exceptions/index.js');

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    constructor(id, customer, metadata) {
      super(id, metadata);
      this.customer = customer;
    }

    eventName() {
      return 'order.placed';
    }
  }
  class Order extends domain.AggregateRoot {
    constructor(id, customer) {
      super(new domain.IdType(id));
      this.customer = customer;
    }

    static place(id, customer) {
      const order = new Order(id, customer);
      order.record(new OrderPlaced(id, customer));
      return order;
    }
  }
  const mapper = {
    toPrimitives: (order) => ({ id: order.id.value, customer: order.customer }),
    fromPrimitives: (row) => new Order(row.id, row.customer),
  };
  return { Order, OrderPlaced, mapper };
}

function smoke(m) {
  return [
    [
      'the in-memory repository saves, loads copies, overwrites and deletes',
      async () => {
        const { Order, mapper } = orderModel();
        const repository = new m.InMemoryRepository(mapper);
        const id = new domain.IdType(ORDER_ID);
        await repository.save(Order.place(ORDER_ID, 'Ana'));
        const first = await repository.findById(id);
        const second = await repository.findById(id);
        await repository.save(Order.place(ORDER_ID, 'Luis'));
        const overwritten = await repository.findById(id);
        await repository.delete(id);
        const deleted = await repository.findById(id);
        return (
          (first.customer === 'Ana' &&
            first !== second &&
            overwritten.customer === 'Luis' &&
            deleted === null) ||
          'unexpected in-memory repository behavior'
        );
      },
    ],
    [
      'events go through the bus and come back from their JSON',
      async () => {
        const { Order, OrderPlaced } = orderModel();
        const bus = new m.InMemoryEventBus();
        const received = [];
        bus.subscribe('order.placed', (event) => {
          received.push(event.customer);
        });
        const events = Order.place(ORDER_ID, 'Ana').pullDomainEvents();
        await bus.publish(events);
        const registry = new m.DomainEventRegistry().register(
          'order.placed',
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
          new esmExceptions.ValidationException(['Email: Value does not satisfy isEmail']),
        );
        return mapped.status === 422 || `unexpected status ${mapped.status}`;
      },
    ],
  ];
}

module.exports = { smoke, crossBuild };
