import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateRemover } from '../../../src/domain/repository/aggregate-remover';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType {}

class Warehouse extends AggregateRoot<WarehouseId> {}

describe('AggregateRemover: the domain contract of a repository that can remove', () => {
  it('offers only remove, typed by the aggregate and its id', () => {
    expectTypeOf<keyof AggregateRemover<Warehouse>>().toEqualTypeOf<'remove'>();
    expectTypeOf<AggregateRemover<Warehouse>['remove']>().toEqualTypeOf<
      (id: WarehouseId) => Promise<void>
    >();
  });
});
