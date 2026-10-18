import { describe, expectTypeOf, it } from 'vitest';
import type { AggregateRemover } from '../../../src/domain/repository/aggregate-remover';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType {}

class Warehouse extends AggregateRoot<WarehouseId> {}

describe('AggregateRemover: the domain contract of a repository that can delete', () => {
  it('offers only delete, typed by the aggregate and its id', () => {
    expectTypeOf<keyof AggregateRemover<Warehouse>>().toEqualTypeOf<'delete'>();
    expectTypeOf<AggregateRemover<Warehouse>['delete']>().toEqualTypeOf<
      (id: WarehouseId) => Promise<void>
    >();
  });
});
