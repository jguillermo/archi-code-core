import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateSearcher } from '../../../src/domain/repository/aggregate-searcher';
import { AggregateRoot, Criteria, IdType, Required, StringType } from '../../../src/domain/index';
import type { PrimitiveTypes, SearchOptions, SearchResult } from '../../../src/domain/index';

class WarehouseId extends IdType<'WarehouseId'> {}
class WarehouseCity extends Required(StringType) {}

class Warehouse extends AggregateRoot<WarehouseId> {
  constructor(
    id: WarehouseId,
    readonly city: WarehouseCity,
  ) {
    super(id);
  }

  toPrimitives(): PrimitiveTypes<Warehouse> {
    return { id: this.id.value, city: this.city.value };
  }
}

class Dock extends AggregateRoot<WarehouseId> {}

describe('AggregateSearcher: the domain contract of a repository that can search with a criteria', () => {
  it('offers only search, which takes a criteria of the aggregate and returns its aggregates', () => {
    expectTypeOf<keyof AggregateSearcher<Warehouse>>().toEqualTypeOf<'search'>();
    expectTypeOf<AggregateSearcher<Warehouse>['search']>().toEqualTypeOf<
      (criteria: Criteria<Warehouse>, options?: SearchOptions) => Promise<SearchResult<Warehouse>>
    >();
  });

  it('only fits an aggregate that converts itself to primitives', () => {
    // @ts-expect-error a criteria reads the aggregate through toPrimitives
    expectTypeOf<AggregateSearcher<Dock>>().not.toBeNever();
  });
});
