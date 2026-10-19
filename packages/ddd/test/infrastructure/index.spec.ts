import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  AggregateClass,
  EventFactory,
  HttpError,
  HttpErrorBody,
  IdempotentDelivery,
  InboxStore,
  OutboxDelivery,
  OutboxEntry,
  OutboxStore,
  PublishedContract,
  PublishedMessage,
  TransactionParticipant,
} from '../../src/infrastructure/index';
import { AggregateRoot, EventBase } from '../../src/domain/index';
import type { SerializedEvent } from '../../src/domain/index';
import type { ValidationIssue } from '../../src/exceptions/index';
import { InMemoryRepository } from '../../src/infrastructure/repository/in-memory-repository';
import { AggregateMapper } from '../../src/infrastructure/repository/aggregate-mapper';

const PUBLIC_API = [
  'AggregateMapper',
  'DomainEventRegistry',
  'EventDispatcher',
  'FixedClock',
  'HttpErrorMapper',
  'InMemoryEventBus',
  'InMemoryInbox',
  'InMemoryOutbox',
  'InMemoryRepository',
  'InMemoryTransactionRunner',
  'OutboxRelay',
  'PublishedLanguage',
  'SystemClock',
];

class OrderPlaced extends EventBase {
  static readonly eventName = 'order.placed';
}

describe('@archi-code/ddd/infrastructure', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(infrastructure).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(infrastructure.InMemoryRepository).toBe(InMemoryRepository);
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
    expectTypeOf<EventFactory<OrderPlaced>>().toEqualTypeOf<
      (serialized: SerializedEvent) => OrderPlaced
    >();
    expectTypeOf<HttpErrorBody>().toEqualTypeOf<{
      code: string;
      message: string;
      errors?: readonly ValidationIssue[];
    }>();
    expectTypeOf<HttpError>().toEqualTypeOf<{ status: number; body: HttpErrorBody }>();
    expectTypeOf<TransactionParticipant>().toEqualTypeOf<{ snapshot(): () => void }>();
    expectTypeOf<InboxStore['markProcessed']>().toEqualTypeOf<
      (consumer: string, eventId: string) => Promise<boolean>
    >();
    expectTypeOf<IdempotentDelivery>().toHaveProperty('inbox');
    expectTypeOf<PublishedContract>().toHaveProperty('data');
    expectTypeOf<PublishedMessage>().toEqualTypeOf<{
      readonly name: string;
      readonly version: number;
      readonly messageId: string;
      readonly occurredOn: string;
      readonly data: Readonly<Record<string, unknown>>;
    }>();
    expectTypeOf<IdempotentDelivery>().toHaveProperty('transactions');
    expectTypeOf<OutboxEntry>().toEqualTypeOf<{
      readonly sequence: number;
      readonly event: SerializedEvent;
    }>();
    expectTypeOf<OutboxStore['pending']>().toEqualTypeOf<
      (limit: number) => Promise<readonly OutboxEntry[]>
    >();
    expectTypeOf<OutboxDelivery>().toEqualTypeOf<
      (event: SerializedEvent) => Promise<void> | void
    >();
  });
});
