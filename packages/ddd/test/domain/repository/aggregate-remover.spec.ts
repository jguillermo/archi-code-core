import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateRemover } from '../../../src/domain/repository/aggregate-remover';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType<'WarehouseId'> {}

class Warehouse extends AggregateRoot<WarehouseId> {}

describe('AggregateRemover: the domain contract of a repository that can remove', () => {
  it('offers only remove, which receives the loaded aggregate so its version can be checked', () => {
    expectTypeOf<keyof AggregateRemover<Warehouse>>().toEqualTypeOf<'remove'>();
    expectTypeOf<AggregateRemover<Warehouse>['remove']>().toEqualTypeOf<
      (aggregate: Warehouse) => Promise<void>
    >();
    expectTypeOf<AggregateRemover<Warehouse>['remove']>()
      .parameter(0)
      .not.toEqualTypeOf<WarehouseId>();
  });
});
