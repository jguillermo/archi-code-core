import { describe, expect, expectTypeOf, it } from 'vitest';
import * as infrastructure from '../../src/infrastructure/index';
import type {
  AggregateClass,
  HttpError,
  HttpErrorBody,
  InMemoryEventChannelOptions,
  TransactionParticipant,
} from '../../src/infrastructure/index';
import { AggregateRoot } from '../../src/domain/index';
import type { ValidationIssue } from '../../src/exceptions/index';
import { InMemoryRepository } from '../../src/infrastructure/repository/in-memory-repository';
import { AggregateMapper } from '../../src/infrastructure/repository/aggregate-mapper';

const PUBLIC_API = [
  'AggregateMapper',
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
    expectTypeOf<InMemoryEventChannelOptions>().toEqualTypeOf<{
      readonly delivery?: 'serial' | 'parallel';
    }>();
  });
});
