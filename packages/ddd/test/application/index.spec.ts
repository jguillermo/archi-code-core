import { describe, expect, expectTypeOf, it } from 'vitest';
import * as application from '../../src/application/index';
import type {
  ChannelHandler,
  ChannelSubscription,
  Clock,
  EventBus,
  EventChannel,
  EventFactory,
  EventSubscriber,
  Subscription,
  TransactionRunner,
} from '../../src/application/index';
import { DomainEventBus } from '../../src/application/event/domain-event-bus';
import { EventRegistry } from '../../src/application/event/event-registry';
import { EventListener } from '../../src/application/event/event-listener';
import { ListensTo } from '../../src/application/event/listens-to';
import { UseCase } from '../../src/application/use-case/use-case';
import type { EventBase, SerializedEvent } from '../../src/domain/index';

const PUBLIC_API = ['DomainEventBus', 'EventListener', 'EventRegistry', 'ListensTo', 'UseCase'];

describe('@archi-code/ddd/application', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(application).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules declare', () => {
    expect(application.UseCase).toBe(UseCase);
    expect(application.EventListener).toBe(EventListener);
    expect(application.ListensTo).toBe(ListensTo);
    expect(application.DomainEventBus).toBe(DomainEventBus);
    expect(application.EventRegistry).toBe(EventRegistry);
  });

  it('exports no repository contract: they belong to the domain', () => {
    expect(Object.keys(application).filter((name) => name.startsWith('Aggregate'))).toEqual([]);
  });

  it('exports the ports as types', () => {
    expectTypeOf<Clock>().toEqualTypeOf<{ now(): Date }>();
    expectTypeOf<EventBus['publish']>().toEqualTypeOf<
      (events: readonly EventBase[]) => Promise<void>
    >();
    expectTypeOf<EventSubscriber['subscribe']>().returns.toEqualTypeOf<Promise<Subscription>>();
    expectTypeOf<EventChannel['send']>().toEqualTypeOf<
      (events: readonly SerializedEvent[]) => Promise<void>
    >();
    expectTypeOf<ChannelHandler>().toEqualTypeOf<(event: SerializedEvent) => Promise<void>>();
    expectTypeOf<ChannelSubscription>().toEqualTypeOf<{ close(): Promise<void> }>();
    expectTypeOf<EventFactory<EventBase>>().toEqualTypeOf<
      (serialized: SerializedEvent) => EventBase
    >();
    expectTypeOf<TransactionRunner['run']>().toEqualTypeOf<
      <Result>(work: () => Promise<Result>) => Promise<Result>
    >();
  });
});
