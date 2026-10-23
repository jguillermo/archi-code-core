'use strict';

const path = require('path');

const application = require(path.resolve(__dirname, '../../dist/cjs/application/index.js'));
const domain = require(path.resolve(__dirname, '../../dist/cjs/domain/index.js'));

const ORDER_ID = '9b2f6c1e-4d3a-4f8b-a1c2-3e4d5f6a7b8c';
const OTHER_ORDER_ID = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

function orderModel() {
  class OrderPlaced extends domain.EventBase {
    static eventName = 'OrderPlaced';

    constructor(orderId, customer, metadata) {
      super(metadata);
      this.orderId = orderId;
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
      'a repository written per aggregate saves, loads copies, checks versions and removes',
      async () => {
        const { Order } = orderModel();
        class InMemoryOrderRepository {
          constructor() {
            this.rows = new Map();
            this.versions = new WeakMap();
          }

          async findById(id) {
            const row = this.rows.get(id.value);
            if (row === undefined) {
              return null;
            }
            const order = Order.fromPrimitives(structuredClone(row.primitives));
            this.versions.set(order, row.version);
            return order;
          }

          async save(order) {
            const version = this.checkedVersion(order);
            const primitives = structuredClone(order.toPrimitives());
            this.rows.set(order.id.value, { version: version + 1, primitives });
            this.versions.set(order, version + 1);
          }

          async remove(order) {
            this.checkedVersion(order);
            this.rows.delete(order.id.value);
          }

          checkedVersion(order) {
            const key = order.id.value;
            const version = this.versions.get(order) ?? 0;
            if ((this.rows.get(key)?.version ?? 0) !== version) {
              throw new application.ConcurrencyException('Order', key, version);
            }
            return version;
          }
        }
        const repository = new InMemoryOrderRepository();
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
            repository.versions.get(first) === 2 &&
            repository.versions.get(stored) === 2 &&
            conflict instanceof application.ConcurrencyException &&
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
          (json) => new OrderPlaced(json.orderId, json.customer, json),
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
          (json) => new OrderPlaced(json.orderId, json.customer, json),
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
          await channel.send([{ ...new OrderPlaced(ORDER_ID, 'Ana') }]);
        } catch (error) {
          failure = error;
        }
        return (
          (failure instanceof m.EventDeliveryException &&
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
            (json) => new OrderPlaced(json.orderId, json.customer, json),
          ),
          memory,
        );
        await bus.subscribe(new ReserveStockOnOrderPlaced());
        await bus.publish([new OrderPlaced(ORDER_ID, 'Ana')]).catch(() => undefined);
        new m.SilentLogger().error('ignored');
        const levels = memory.entries.map((entry) => `${entry.level}:${entry.message}`);
        return (
          (written.length === 1 &&
            written[0].level === 'warn' &&
            written[0].time === '2026-10-19T09:30:00.000Z' &&
            written[0].context.at === '2026-10-19T09:30:00.000Z' &&
            levels.join() === 'info:event_listener_subscribed,error:event_listener_failed') ||
          `unexpected logging: ${JSON.stringify(written)} ${levels.join()}`
        );
      },
    ],
    [
      'clocks are injectable',
      () => {
        const clock = new m.FixedClock('2026-01-01T00:00:00Z');
        clock.advance(1000);
        return (
          (clock.now().toISOString() === '2026-01-01T00:00:01.000Z' &&
            new m.SystemClock().now() instanceof Date) ||
          'unexpected clock'
        );
      },
    ],
    [
      'infrastructure exceptions carry their codes and cause',
      () => {
        const cause = new Error('ECONNRESET');
        const internal = new m.InternalErrorException('saving order', { cause });
        return (
          (internal.cause === cause &&
            internal.code === m.InfrastructureExceptionCode.InternalError &&
            internal.description === 'Infrastructure Exception (INF000), Internal Error (INF001)' &&
            internal instanceof m.InfrastructureException &&
            new m.UnknownEventException('OrderCancelled').code === 'INF002') ||
          'unexpected infrastructure exception shape'
        );
      },
    ],
    [
      'the classifier tells entry points the kind of every failure of every layer',
      () => {
        const kinds = [
          new application.AggregateNotFoundException('Order', ORDER_ID),
          new application.NotAllowedException('cus-luis cannot cancel'),
          new application.ConcurrencyException('Order', ORDER_ID, 3),
          new domain.RequiredValueException('Email', ''),
          new domain.DomainException('Order already shipped', ['ORD001']),
          new application.ApplicationException('Email already used', ['USR001']),
          new application.UnexpectedErrorException('PlaceOrder: boom'),
          new domain.InvalidEventDefinitionException('OrderArchived'),
          new m.InternalErrorException('password=secret'),
          new Error('disk full'),
        ].map((error) => m.ExceptionClassifier.classify(error));
        return (
          kinds.join() ===
            [
              m.ExceptionKind.NotFound,
              m.ExceptionKind.NotAllowed,
              m.ExceptionKind.Conflict,
              m.ExceptionKind.Malformed,
              m.ExceptionKind.Invalid,
              m.ExceptionKind.Rejected,
              m.ExceptionKind.Internal,
              m.ExceptionKind.Internal,
              m.ExceptionKind.Internal,
              m.ExceptionKind.Internal,
            ].join() || `unexpected kinds ${kinds.join()}`
        );
      },
    ],
  ];
}

function crossBuild(cjs, esm) {
  return [
    [
      'recognize infrastructure exceptions thrown by the other build',
      () => {
        const delivery = new esm.EventDeliveryException('OrderPlaced', [], 0);
        return (
          (delivery instanceof cjs.EventDeliveryException &&
            delivery instanceof cjs.InfrastructureException &&
            !(delivery instanceof cjs.InternalErrorException)) ||
          'an infrastructure exception of one build is not recognized by the other'
        );
      },
    ],
    [
      'the classifier of one build classifies exceptions thrown by the other',
      async () => {
        const esmDomain = await import('../../dist/esm/domain/index.js');
        const esmApplication = await import('../../dist/esm/application/index.js');
        const invalid = new esmDomain.ValidationException([
          { field: 'email', message: 'Email: Value does not satisfy isEmail' },
        ]);
        const notFound = new application.AggregateNotFoundException('Order', ORDER_ID);
        const unexpected = new esmApplication.UnexpectedErrorException('PlaceOrder: boom');
        return (
          (cjs.ExceptionClassifier.classify(invalid) === 'invalid' &&
            esm.ExceptionClassifier.classify(notFound) === 'not_found' &&
            cjs.ExceptionClassifier.classify(unexpected) === 'internal') ||
          'a classifier does not recognize the exceptions of the other build'
        );
      },
    ],
  ];
}

async function infrastructureInThePage(entry) {
  const m = await import(entry);
  const pageApplication = await import(new URL('../application/index.js', entry).href);
  const pageDomain = await import(new URL('../domain/index.js', entry).href);
  const failures = [];
  const expect = (name, passed) => {
    if (!passed) failures.push(name);
  };

  class OrderPlaced extends pageDomain.EventBase {
    static eventName = 'OrderPlaced';

    constructor(orderId, metadata) {
      super(metadata);
      this.orderId = orderId;
    }
  }
  const received = [];
  class ConfirmOrderOnOrderPlaced extends pageApplication.EventListener {
    handle(event) {
      received.push(event);
    }
  }
  pageApplication.ListensTo(OrderPlaced, { consumer: 'confirm-order' })(ConfirmOrderOnOrderPlaced);
  class ReserveStockOnOrderPlaced extends pageApplication.EventListener {
    handle() {
      throw new Error('warehouse offline');
    }
  }
  pageApplication.ListensTo(OrderPlaced, { consumer: 'reserve-stock' })(ReserveStockOnOrderPlaced);

  const logger = new m.InMemoryLogger();
  const channel = new m.InMemoryEventChannel({ delivery: 'parallel' });
  const registry = new m.EventRegistry().register(
    OrderPlaced,
    (json) => new OrderPlaced(json.orderId, json),
  );
  const bus = new m.DomainEventBus(channel, registry, logger);
  await bus.subscribe(new ConfirmOrderOnOrderPlaced());
  await bus.subscribe(new ReserveStockOnOrderPlaced());
  const event = new OrderPlaced(pageDomain.UuidType.random());
  const failure = await bus.publish([event]).catch((error) => error);
  expect(
    'the bus delivers the rebuilt event and reports the failing consumer',
    received.length === 1 &&
      received[0] instanceof OrderPlaced &&
      received[0] !== event &&
      received[0].eventId === event.eventId &&
      failure instanceof m.EventDeliveryException &&
      failure.errors.length === 1 &&
      channel.sent.length === 1,
  );
  expect(
    'the bus logs the failing listener',
    logger.entries.some(
      (logEntry) => logEntry.level === 'error' && logEntry.message === 'event_listener_failed',
    ),
  );

  const lines = [];
  const original = console.info;
  console.info = (line) => lines.push(JSON.parse(line));
  try {
    new m.ConsoleLogger({ clock: new m.FixedClock('2026-10-19T09:30:00Z') }).info('order_placed', {
      cause: new Error('ignored'),
    });
  } finally {
    console.info = original;
  }
  expect(
    'ConsoleLogger writes one JSON line',
    lines.length === 1 &&
      lines[0].time === '2026-10-19T09:30:00.000Z' &&
      lines[0].context.cause.message === 'ignored',
  );

  expect(
    'the classifier reads every layer',
    m.ExceptionClassifier.classify(new pageApplication.AggregateNotFoundException('Order', 'x')) ===
      m.ExceptionKind.NotFound &&
      m.ExceptionClassifier.classify(new pageDomain.RequiredValueException('Email', '')) ===
        m.ExceptionKind.Malformed &&
      m.ExceptionClassifier.classify(new Error('disk full')) === m.ExceptionKind.Internal,
  );

  return failures.length === 0 || failures.join('; ');
}

function browser() {
  return [['runs the event bus, the in-memory channel and the loggers', infrastructureInThePage]];
}

module.exports = { smoke, crossBuild, browser };
