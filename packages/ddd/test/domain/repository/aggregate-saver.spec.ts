import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateSaver } from '../../../src/domain/repository/aggregate-saver';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType<'WarehouseId'> {}

class Warehouse extends AggregateRoot<WarehouseId> {}

describe('AggregateSaver: the domain contract of a repository that can save', () => {
  it('offers only save, typed by the aggregate and its id', () => {
    expectTypeOf<keyof AggregateSaver<Warehouse>>().toEqualTypeOf<'save'>();
    expectTypeOf<AggregateSaver<Warehouse>['save']>().toEqualTypeOf<
      (aggregate: Warehouse) => Promise<void>
    >();
  });
});
