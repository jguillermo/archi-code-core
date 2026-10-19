import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  AggregateClass,
  ChannelHandler,
  ChannelSubscription,
  EventChannel,
  EventFactory,
  HttpError,
  HttpErrorBody,
  InMemoryEventChannelOptions,
  Subscription,
  TransactionParticipant,
} from '../../src/infrastructure/index';
import { AggregateRoot } from '../../src/domain/index';
import type { EventBase, SerializedEvent } from '../../src/domain/index';
import { DomainEventBus } from '../../src/infrastructure/event/domain-event-bus';
import { EventRegistry } from '../../src/infrastructure/event/event-registry';
import type { ValidationIssue } from '../../src/exceptions/index';
import { InMemoryRepository } from '../../src/infrastructure/repository/in-memory-repository';
import { AggregateMapper } from '../../src/infrastructure/repository/aggregate-mapper';

const PUBLIC_API = [
  'AggregateMapper',
  'DomainEventBus',
  'EventRegistry',
  'FixedClock',
  'HttpErrorMapper',
  'InMemoryEventChannel',
  'InMemoryRepository',
  'InMemoryTransactionRunner',
  'SystemClock',
];

describe('@archi-code/ddd/infrastructure', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(infrastructure).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(infrastructure.InMemoryRepository).toBe(InMemoryRepository);
    expect(infrastructure.DomainEventBus).toBe(DomainEventBus);
    expect(infrastructure.EventRegistry).toBe(EventRegistry);
  });

  it('exports the aggregate mapper next to the repositories that use it', () => {
    expect(infrastructure.AggregateMapper).toBe(AggregateMapper);
  });

  it('exports every value as a class', () => {
    for (const name of PUBLIC_API) {
      expect(typeof infrastructure[name as keyof typeof infrastructure]).toBe('function');
    }
  });

  it('exports the public types', () => {
    expectTypeOf<AggregateClass<AggregateRoot>>().toHaveProperty('fromPrimitives');
    expectTypeOf<AggregateClass<AggregateRoot>>().toHaveProperty('name');
    expectTypeOf<HttpErrorBody>().toEqualTypeOf<{
      code: string;
      message: string;
      errors?: readonly ValidationIssue[];
    }>();
    expectTypeOf<HttpError>().toEqualTypeOf<{ status: number; body: HttpErrorBody }>();
    expectTypeOf<TransactionParticipant>().toEqualTypeOf<{ snapshot(): () => void }>();
    expectTypeOf<EventChannel['send']>().toEqualTypeOf<
      (events: readonly SerializedEvent[]) => Promise<void>
    >();
    expectTypeOf<ChannelHandler>().toEqualTypeOf<(event: SerializedEvent) => Promise<void>>();
    expectTypeOf<ChannelSubscription>().toEqualTypeOf<{ close(): Promise<void> }>();
    expectTypeOf<Subscription>().toEqualTypeOf<{ unsubscribe(): Promise<void> }>();
    expectTypeOf<EventFactory<EventBase>>().toEqualTypeOf<
      (serialized: SerializedEvent) => EventBase
    >();
    expectTypeOf<InMemoryEventChannelOptions>().toEqualTypeOf<{
      readonly delivery?: 'serial' | 'parallel';
    }>();
  });
});
