import { describe, expect, expectTypeOf, it } from 'vitest';
import * as application from '../../src/application/index';
import type {
  Clock,
  EventBus,
  ListenerSubscription,
  ListensToOptions,
  LogContext,
  Logger,
  LogLevel,
  TransactionRunner,
} from '../../src/application/index';
import { EventListener } from '../../src/application/event/event-listener';
import { ListensTo } from '../../src/application/event/listens-to';
import { UseCase } from '../../src/application/use-case/use-case';
import type { EventBase } from '../../src/domain/index';

const PUBLIC_API = ['EventListener', 'ListensTo', 'UseCase'];

describe('@archi-code/ddd/application', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(application).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules declare', () => {
    expect(application.UseCase).toBe(UseCase);
    expect(application.EventListener).toBe(EventListener);
    expect(application.ListensTo).toBe(ListensTo);
  });

  it('exports no repository contract: they belong to the domain', () => {
    expect(Object.keys(application).filter((name) => name.startsWith('Aggregate'))).toEqual([]);
  });

  it('exports no event transport: buses, registries and channels belong to infrastructure', () => {
    expect(Object.keys(application).filter((name) => /Bus|Registry|Channel/.test(name))).toEqual(
      [],
    );
  });

  it('exports the ports as types', () => {
    expectTypeOf<Clock>().toEqualTypeOf<{ now(): Date }>();
    expectTypeOf<EventBus['publish']>().toEqualTypeOf<
      (events: readonly EventBase[]) => Promise<void>
    >();
    expectTypeOf<ListensToOptions>().toEqualTypeOf<{ readonly consumer: string }>();
    expectTypeOf<ListenerSubscription>().toEqualTypeOf<{
      readonly eventName: string;
      readonly consumer: string;
    }>();
    expectTypeOf<LogLevel>().toEqualTypeOf<'debug' | 'info' | 'warn' | 'error'>();
    expectTypeOf<Logger['warn']>().toEqualTypeOf<(message: string, context?: LogContext) => void>();
    expectTypeOf<TransactionRunner['run']>().toEqualTypeOf<
      <Result>(work: () => Promise<Result>) => Promise<Result>
    >();
  });
});
