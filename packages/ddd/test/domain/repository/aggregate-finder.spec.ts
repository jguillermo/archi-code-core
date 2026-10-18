import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateFinder } from '../../../src/domain/repository/aggregate-finder';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType {}

class Warehouse extends AggregateRoot<WarehouseId> {}

describe('AggregateFinder: the domain contract of a repository that can findById', () => {
  it('offers only findById, typed by the aggregate and its id', () => {
    expectTypeOf<keyof AggregateFinder<Warehouse>>().toEqualTypeOf<'findById'>();
    expectTypeOf<AggregateFinder<Warehouse>['findById']>().toEqualTypeOf<
      (id: WarehouseId) => Promise<Warehouse | null>
    >();
  });
});
