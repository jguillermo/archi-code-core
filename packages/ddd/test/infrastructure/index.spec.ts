import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  ChannelHandler,
  ChannelSubscription,
  ConsoleLoggerOptions,
  EventChannel,
  EventFactory,
  IndexedDbDatabaseOptions,
  IndexedDbExceptionReason,
  IndexedDbInput,
  IndexedDbMigration,
  IndexedDbPage,
  IndexedDbQuery,
  IndexedDbStored,
  IndexedDbTable,
  IndexedDbTableIndex,
  InMemoryEventChannelOptions,
  LogEntry,
  Subscription,
} from '../../src/infrastructure/index';
import type { EventBase, SerializedEvent } from '../../src/domain/index';
import type { LogContext, Logger, LogLevel } from '../../src/application/index';
import { DomainEventBus } from '../../src/infrastructure/event/domain-event-bus';
import { EventRegistry } from '../../src/infrastructure/event/event-registry';

const PUBLIC_API = [
  'ConsoleLogger',
  'DomainEventBus',
  'EventDeliveryException',
  'EventRegistry',
  'ExceptionClassifier',
  'ExceptionKind',
  'InMemoryEventChannel',
  'InMemoryLogger',
  'IndexedDbDatabase',
  'IndexedDbException',
  'IndexedDbSchema',
  'InfrastructureException',
  'InfrastructureExceptionCode',
  'InternalErrorException',
  'SilentLogger',
  'UnknownEventException',
];

const ENUMS = ['ExceptionKind', 'InfrastructureExceptionCode'];

describe('@archi-code/ddd/infrastructure', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(infrastructure).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(infrastructure.DomainEventBus).toBe(DomainEventBus);
    expect(infrastructure.EventRegistry).toBe(EventRegistry);
  });

  it('exports no repository: each project writes one per aggregate and technology', () => {
    expect(Object.keys(infrastructure).filter((name) => name.endsWith('Repository'))).toEqual([]);
  });

  it('exports no aggregate mapper: each aggregate converts itself', () => {
    expect(Object.keys(infrastructure).filter((name) => /Aggregate|Mapper/.test(name))).toEqual([]);
  });

  it('exports no protocol adapter: each entry point translates the ExceptionKind itself', () => {
    expect(Object.keys(infrastructure).filter((name) => /Http|Grpc|Amqp/.test(name))).toEqual([]);
  });

  it('exports the loggers that implement the Logger port of the application', () => {
    for (const name of ['ConsoleLogger', 'InMemoryLogger', 'SilentLogger'] as const) {
      expectTypeOf<InstanceType<(typeof infrastructure)[typeof name]>>().toMatchTypeOf<Logger>();
      expect(typeof new infrastructure[name]().warn).toBe('function');
    }
  });

  it('exports only the exceptions of the infrastructure, their codes and the classifier entry points use', () => {
    expect(Object.keys(infrastructure).filter((name) => name.endsWith('Exception'))).toEqual([
      'InfrastructureException',
      'InternalErrorException',
      'IndexedDbException',
      'UnknownEventException',
      'EventDeliveryException',
    ]);
    expect(infrastructure.InfrastructureExceptionCode.InternalError).toBe('INF001');
    expect(infrastructure.ExceptionKind.NotFound).toBe('not_found');
    expect(Object.keys(infrastructure)).not.toContain('AbstractException');
  });

  it('exports the IndexedDB database and schema a project subclasses, and the table only as a type', () => {
    class ShopDb extends infrastructure.IndexedDbDatabase {
      constructor() {
        super({ name: 'shop' });
      }
    }
    class OrderSchema extends infrastructure.IndexedDbSchema<
      { id: string; total: number },
      { id: string; total: number; createdAt: string }
    > {
      constructor() {
        super({ name: 'orders', audit: { createdAt: { onInsert: () => 'now' } } });
      }
    }
    const table = new ShopDb().table(new OrderSchema());

    expect(Object.keys(infrastructure)).not.toContain('IndexedDbTable');
    expectTypeOf(table).toEqualTypeOf<
      IndexedDbTable<
        { id: string; total: number },
        { id: string; total: number; createdAt: string }
      >
    >();
    expectTypeOf(table.persist)
      .parameter(0)
      .toEqualTypeOf<IndexedDbInput<{ id: string; total: number }>>();
    expectTypeOf(table.find).returns.resolves.toEqualTypeOf<
      IndexedDbPage<IndexedDbStored<{ id: string; total: number; createdAt: string }>>
    >();
    expectTypeOf(table.remove).parameters.toEqualTypeOf<[id: string, rowVersion?: number | null]>();
    expectTypeOf(table.indexes).toEqualTypeOf<readonly IndexedDbTableIndex[]>();
    expectTypeOf<IndexedDbQuery<{ id: string }>['after']>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<IndexedDbMigration>().toEqualTypeOf<(row: any) => object | null>();
    expectTypeOf<IndexedDbDatabaseOptions['idleTimeout']>().toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf<'quota_exceeded'>().toMatchTypeOf<IndexedDbExceptionReason>();
  });

  it('exports every value as a class, except the enums', () => {
    for (const name of PUBLIC_API.filter((name) => !ENUMS.includes(name))) {
      expect(typeof infrastructure[name as keyof typeof infrastructure]).toBe('function');
    }
  });

  it('exports the public types', () => {
    expectTypeOf<EventChannel['send']>().toEqualTypeOf<
      (events: readonly SerializedEvent[]) => Promise<void>
    >();
    expectTypeOf<ChannelHandler>().toEqualTypeOf<(event: SerializedEvent) => Promise<void>>();
    expectTypeOf<ChannelSubscription>().toEqualTypeOf<{ close(): Promise<void> }>();
    expectTypeOf<Subscription>().toEqualTypeOf<{ unsubscribe(): Promise<void> }>();
    expectTypeOf<EventFactory<EventBase>>().toEqualTypeOf<
      (serialized: SerializedEvent) => EventBase
    >();
    expectTypeOf<ConsoleLoggerOptions>().toEqualTypeOf<{
      readonly level?: LogLevel;
    }>();
    expectTypeOf<LogEntry>().toEqualTypeOf<{
      readonly level: LogLevel;
      readonly message: string;
      readonly context?: LogContext;
    }>();
    expectTypeOf<InMemoryEventChannelOptions>().toEqualTypeOf<{
      readonly delivery?: 'serial' | 'parallel';
    }>();
  });
});
