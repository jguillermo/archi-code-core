import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  AggregateMapper,
  EventFactory,
  EventHandler,
  HttpError,
  HttpErrorBody,
} from '../../src/infrastructure/index';
import { EventBase } from '../../src/domain/index';
import type { SerializedEvent } from '../../src/domain/index';
import { InMemoryRepository } from '../../src/infrastructure/repository/in-memory-repository';

const PUBLIC_API = [
  'DomainEventRegistry',
  'FixedClock',
  'HttpErrorMapper',
  'InMemoryEventBus',
  'InMemoryRepository',
  'SystemClock',
];

class OrderPlaced extends EventBase {
  eventName(): string {
    return 'order.placed';
  }
}

describe('@archi-code/ddd/infrastructure', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(infrastructure).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same classes the modules define', () => {
    expect(infrastructure.InMemoryRepository).toBe(InMemoryRepository);
  });

  it('exports every value as a class', () => {
    for (const name of PUBLIC_API) {
      expect(typeof infrastructure[name as keyof typeof infrastructure]).toBe('function');
    }
  });

  it('exports the public types', () => {
    expectTypeOf<AggregateMapper<string, number>>().toEqualTypeOf<{
      toPrimitives(aggregate: string): number;
      fromPrimitives(primitives: number): string;
    }>();
    expectTypeOf<EventHandler<OrderPlaced>>().toEqualTypeOf<
      (event: OrderPlaced) => Promise<void> | void
    >();
    expectTypeOf<EventFactory<OrderPlaced>>().toEqualTypeOf<
      (serialized: SerializedEvent) => OrderPlaced
    >();
    expectTypeOf<HttpErrorBody>().toEqualTypeOf<{
      code: string;
      message: string;
      errors?: readonly string[];
    }>();
    expectTypeOf<HttpError>().toEqualTypeOf<{ status: number; body: HttpErrorBody }>();
  });
});
