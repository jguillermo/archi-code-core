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
} from '../../src/application/index';
import { EventListener } from '../../src/application/event/event-listener';
import { ListensTo } from '../../src/application/event/listens-to';
import { UseCase } from '../../src/application/use-case/use-case';
import type { EventBase } from '../../src/domain/index';

const PUBLIC_API = [
  'AggregateNotFoundException',
  'ApplicationException',
  'ApplicationExceptionCode',
  'ConcurrencyException',
  'EventListener',
  'ListensTo',
  'NotAllowedException',
  'UnexpectedErrorException',
  'UseCase',
  'ValueObjectBuilder',
];

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
    expect(
      Object.keys(application).filter(
        (name) => name.startsWith('Aggregate') && !name.endsWith('Exception'),
      ),
    ).toEqual([]);
  });

  it('exports only the exceptions of the application and their codes', () => {
    expect(Object.keys(application).filter((name) => name.endsWith('Exception'))).toEqual([
      'ApplicationException',
      'ConcurrencyException',
      'AggregateNotFoundException',
      'NotAllowedException',
      'UnexpectedErrorException',
    ]);
    expect(application.ApplicationExceptionCode.UnexpectedError).toBe('APP004');
    expect(Object.keys(application)).not.toContain('AbstractException');
  });

  it('exports no event transport: buses, registries and channels belong to infrastructure', () => {
    expect(Object.keys(application).filter((name) => /Bus|Registry|Channel/.test(name))).toEqual(
      [],
    );
  });

  it('exports no transaction port: transactions are a concern of each repository', () => {
    expect(Object.keys(application).filter((name) => /Transaction/.test(name))).toEqual([]);
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
  });
});
