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
          const logger = new m.ConsoleLogger({ level: 'warn' });
          logger.info('order_placed');
          logger.warn('stock_low', { sku: 'TORCH-01', at: new Date('2026-10-19T09:30:00Z') });
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
            !Number.isNaN(Date.parse(written[0].time)) &&
            written[0].context.at === '2026-10-19T09:30:00.000Z' &&
            levels.join() === 'info:event_listener_subscribed,error:event_listener_failed') ||
          `unexpected logging: ${JSON.stringify(written)} ${levels.join()}`
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
    [
      'an IndexedDB database is declared anywhere and only fails when used without IndexedDB',
      async () => {
        class OrderSchema extends m.IndexedDbSchema {
          constructor() {
            super({
              name: 'orders',
              indexes: { byCustomer: 'customerId' },
              defaults: { status: 'pending' },
              audit: { createdAt: { onInsert: () => '2026-11-17T10:00:00.000Z' } },
            });
          }
        }
        const schema = new OrderSchema();
        const orders = new m.IndexedDbDatabase({ name: 'shop' }).table(schema);
        const completed = schema.complete(
          { id: ORDER_ID, customerId: 'cus-1', rowVersion: 3 },
          null,
        );
        const error = await orders.get(ORDER_ID).catch((refused) => refused);
        return (
          (orders.name === 'orders' &&
            orders.indexes.length === 2 &&
            completed.status === 'pending' &&
            completed.createdAt === '2026-11-17T10:00:00.000Z' &&
            !('rowVersion' in completed) &&
            error instanceof m.IndexedDbException &&
            error instanceof m.InfrastructureException &&
            error.reason === 'unavailable' &&
            error.code === m.InfrastructureExceptionCode.PersistenceError) ||
          `unexpected IndexedDB declaration: ${error}`
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
    new m.ConsoleLogger().info('order_placed', {
      cause: new Error('ignored'),
    });
  } finally {
    console.info = original;
  }
  expect(
    'ConsoleLogger writes one JSON line',
    lines.length === 1 &&
      !Number.isNaN(Date.parse(lines[0].time)) &&
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

async function indexedDbInThePage(entry) {
  const m = await import(entry);
  const { ConcurrencyException } = await import(new URL('../application/index.js', entry).href);
  const name = `browser-check-${Date.now()}-${Math.random()}`;
  const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
  const page = () => ({
    open: indexedDB.open.bind(indexedDB),
    deleteDatabase: indexedDB.deleteDatabase.bind(indexedDB),
    cmp: indexedDB.cmp.bind(indexedDB),
    databases: indexedDB.databases.bind(indexedDB),
  });
  let now = '2026-11-17T10:00:00.000Z';
  class ShopDb extends m.IndexedDbDatabase {
    constructor(options = {}) {
      super({ name, ...options });
    }
  }
  class OrderSchema extends m.IndexedDbSchema {
    constructor() {
      super({
        name: 'orders',
        indexes: { byCustomer: 'customerId', byTag: { keyPath: 'tags', multiEntry: true } },
        defaults: { status: 'pending' },
        audit: {
          createdAt: { onInsert: () => now },
          updatedAt: { onInsert: () => now, onUpdate: () => now },
        },
      });
    }
  }
  const shop = new ShopDb();
  const orders = shop.table(new OrderSchema());
  await orders.persistMany(
    Array.from({ length: 30 }, (_, at) => ({
      id: uuid(at),
      customerId: `cus-${at % 3}`,
      tags: at % 2 === 0 ? ['gift'] : ['express'],
    })),
  );
  const outbox = shop.table(new m.IndexedDbSchema({ name: 'outbox' }));
  await outbox.persist({ id: uuid(100) });
  const walked = [];
  for await (const batch of orders.iterate(
    { index: 'byCustomer', direction: 'prev' },
    { batchSize: 4 },
  )) {
    walked.push(...batch.map((row) => row.id));
  }
  const tagged = await orders.find({
    index: 'byTag',
    range: IDBKeyRange.only('gift'),
    offset: 2,
    limit: 3,
  });
  const firstPage = await orders.find({ index: 'byCustomer', limit: 4 });
  const secondPage = await orders.find({ index: 'byCustomer', limit: 4, after: firstPage.next });
  const loaded = await orders.get(uuid(1));
  now = '2026-11-18T08:30:00.000Z';
  await orders.persist({ ...loaded, status: 'paid' });
  const stale = await orders.persist({ ...loaded, status: 'cancelled' }).catch((error) => error);
  const saved = await orders.get(uuid(1));
  const takenId = await orders
    .persist({ id: uuid(1), customerId: 'cus-0', tags: [] })
    .catch((e) => e);
  const staleRemove = await orders.remove(uuid(1), loaded.rowVersion).catch((error) => error);
  const rolledBack = await orders
    .persistMany([{ id: uuid(200), customerId: 'cus-9', tags: [] }, { id: '' }])
    .catch((error) => error.reason);
  shop.close();
  const upgraded = new ShopDb({
    factory: page(),
    version: 2,
    migrations: {
      2: {
        orders: (row) => (row.customerId === 'cus-2' ? null : { ...row, customer: row.customerId }),
      },
    },
  });
  const migrated = upgraded.table(
    new m.IndexedDbSchema({ name: 'orders', indexes: { byCustomer: 'customer' } }),
  );
  const afterMigration = await migrated.find({ index: 'byCustomer', limit: 1 });
  const olderCode = await new ShopDb({ factory: page() })
    .table(new OrderSchema())
    .count()
    .catch((error) => error.reason);
  upgraded.close();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = reject;
  });
  return (
    (walked.length === 30 &&
      new Set(walked).size === 30 &&
      walked[0] === uuid(29) &&
      tagged.total === 15 &&
      tagged.items.map((row) => row.id).join() === [4, 6, 8].map(uuid).join() &&
      firstPage.items.length === 4 &&
      secondPage.items[0].id === uuid(12) &&
      loaded.rowVersion === 1 &&
      stale instanceof ConcurrencyException &&
      takenId instanceof ConcurrencyException &&
      staleRemove instanceof ConcurrencyException &&
      saved.status === 'paid' &&
      saved.rowVersion === 2 &&
      saved.createdAt === '2026-11-17T10:00:00.000Z' &&
      saved.updatedAt === '2026-11-18T08:30:00.000Z' &&
      rolledBack === 'invalid_key' &&
      afterMigration.total === 20 &&
      afterMigration.items[0].customer === 'cus-0' &&
      afterMigration.items[0].rowVersion === 1 &&
      olderCode === 'schema_mismatch') ||
    `unexpected IndexedDB in the page: ${JSON.stringify({ walked: walked.length, tagged, first: firstPage.items.map((row) => row.id), second: secondPage.items.map((row) => row.id), stale: String(stale), saved, rolledBack, afterMigration, olderCode })}`
  );
}

function browser() {
  return [
    ['runs the event bus, the in-memory channel and the loggers', infrastructureInThePage],
    ['declares, persists, queries, iterates and migrates IndexedDB', indexedDbInThePage],
  ];
}

module.exports = { smoke, crossBuild, browser };
