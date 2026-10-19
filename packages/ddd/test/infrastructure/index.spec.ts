import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  ChannelHandler,
  ChannelSubscription,
  ConsoleLoggerOptions,
  EventChannel,
  EventFactory,
  HttpError,
  HttpErrorBody,
  HttpErrorMapperOptions,
  InMemoryEventChannelOptions,
  LogEntry,
  Subscription,
} from '../../src/infrastructure/index';
import type { EventBase, SerializedEvent } from '../../src/domain/index';
import type { Clock, LogContext, Logger, LogLevel } from '../../src/application/index';
import { DomainEventBus } from '../../src/infrastructure/event/domain-event-bus';
import { EventRegistry } from '../../src/infrastructure/event/event-registry';
import type { ValidationIssue } from '../../src/exceptions/index';

const PUBLIC_API = [
  'ConsoleLogger',
  'DomainEventBus',
  'EventRegistry',
  'FixedClock',
  'HttpErrorMapper',
  'InMemoryEventChannel',
  'InMemoryLogger',
  'SilentLogger',
  'SystemClock',
];

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
    expect(Object.keys(infrastructure).filter((name) => /Aggregate|Mapper/.test(name))).toEqual([
      'HttpErrorMapper',
    ]);
  });

  it('exports the loggers that implement the Logger port of the application', () => {
    for (const name of ['ConsoleLogger', 'InMemoryLogger', 'SilentLogger'] as const) {
      expectTypeOf<InstanceType<(typeof infrastructure)[typeof name]>>().toMatchTypeOf<Logger>();
      expect(typeof new infrastructure[name]().warn).toBe('function');
    }
  });

  it('exports every value as a class', () => {
    for (const name of PUBLIC_API) {
      expect(typeof infrastructure[name as keyof typeof infrastructure]).toBe('function');
    }
  });

  it('exports the public types', () => {
    expectTypeOf<HttpErrorBody>().toEqualTypeOf<{
      code: string;
      message: string;
      errors?: readonly ValidationIssue[];
    }>();
    expectTypeOf<HttpError>().toEqualTypeOf<{ status: number; body: HttpErrorBody }>();
    expectTypeOf<EventChannel['send']>().toEqualTypeOf<
      (events: readonly SerializedEvent[]) => Promise<void>
    >();
    expectTypeOf<ChannelHandler>().toEqualTypeOf<(event: SerializedEvent) => Promise<void>>();
    expectTypeOf<ChannelSubscription>().toEqualTypeOf<{ close(): Promise<void> }>();
    expectTypeOf<Subscription>().toEqualTypeOf<{ unsubscribe(): Promise<void> }>();
    expectTypeOf<EventFactory<EventBase>>().toEqualTypeOf<
      (serialized: SerializedEvent) => EventBase
    >();
    expectTypeOf<HttpErrorMapperOptions>().toEqualTypeOf<{
      readonly statusByCode?: Readonly<Record<string, number>>;
      readonly logger?: Logger;
    }>();
    expectTypeOf<ConsoleLoggerOptions>().toEqualTypeOf<{
      readonly level?: LogLevel;
      readonly clock?: Clock;
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
