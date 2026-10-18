import { describe, expect, expectTypeOf, it } from 'vitest';
import * as application from '../../src/application/index';
import type {
  AggregateFinder,
  AggregateRemover,
  AggregateSaver,
  Clock,
  EventBus,
} from '../../src/application/index';
import { UseCase } from '../../src/application/use-case/use-case';
import type { AggregateRoot, EventBase } from '../../src/domain/index';

const PUBLIC_API = ['UseCase'];

describe('@archi-code/ddd/application', () => {
  it('exports exactly the public API', () => {
    expect(Object.keys(application).sort()).toEqual(PUBLIC_API);
  });

  it('exports the same UseCase the module declares', () => {
    expect(application.UseCase).toBe(UseCase);
  });

  it('exports the ports as types', () => {
    expectTypeOf<Clock>().toEqualTypeOf<{ now(): Date }>();
    expectTypeOf<EventBus['publish']>().toEqualTypeOf<
      (events: readonly EventBase[]) => Promise<void>
    >();
    expectTypeOf<AggregateSaver<AggregateRoot>['save']>().toEqualTypeOf<
      (aggregate: AggregateRoot) => Promise<void>
    >();
    expectTypeOf<keyof AggregateFinder<AggregateRoot>>().toEqualTypeOf<'findById'>();
    expectTypeOf<keyof AggregateSaver<AggregateRoot>>().toEqualTypeOf<'save'>();
    expectTypeOf<keyof AggregateRemover<AggregateRoot>>().toEqualTypeOf<'delete'>();
  });
});
