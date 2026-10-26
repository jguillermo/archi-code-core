import { describe, expect, expectTypeOf, it } from 'vitest';
import { AggregateRepository } from '../../../src/domain/repository/aggregate-repository';
import type { AggregateFinder } from '../../../src/domain/repository/aggregate-finder';
import type { AggregateSaver } from '../../../src/domain/repository/aggregate-saver';
import { AggregateRoot, IdType } from '../../../src/domain/index';

class WarehouseId extends IdType<'WarehouseId'> {}
class Warehouse extends AggregateRoot<WarehouseId> {}

class TruckId extends IdType<'TruckId'> {}
class Truck extends AggregateRoot<TruckId> {}

abstract class WarehouseRepository
  extends AggregateRepository<Warehouse>
  implements AggregateFinder<Warehouse>, AggregateSaver<Warehouse>
{
  abstract findById(id: WarehouseId): Promise<Warehouse | null>;
  abstract save(warehouse: Warehouse): Promise<void>;
}

class InMemoryWarehouseRepository extends WarehouseRepository {
  private readonly warehouses = new Map<string, Warehouse>();

  async findById(id: WarehouseId): Promise<Warehouse | null> {
    return this.warehouses.get(id.value) ?? null;
  }

  async save(warehouse: Warehouse): Promise<void> {
    this.warehouses.set(warehouse.id.value, warehouse);
  }
}

class InMemoryTruckRepository extends AggregateRepository<Truck> {}

describe('AggregateRepository: the base of the abstract repository a context declares for each aggregate', () => {
  it('declares no verb: the repository of each aggregate declares the ones its business needs', () => {
    expectTypeOf<keyof AggregateRepository<Warehouse>>().toEqualTypeOf<never>();
    expectTypeOf<keyof WarehouseRepository>().toEqualTypeOf<'findById' | 'save'>();
  });

  it('is the class every repository adapter of the aggregate extends', async () => {
    const repository = new InMemoryWarehouseRepository();
    const warehouse = new Warehouse(WarehouseId.generate());
    await repository.save(warehouse);
    expect(await repository.findById(warehouse.id)).toBe(warehouse);
    expect(repository).toBeInstanceOf(WarehouseRepository);
    expect(repository).toBeInstanceOf(AggregateRepository);
  });

  it('is bound to its aggregate: a repository of trucks is not a repository of warehouses', () => {
    expectTypeOf<InMemoryTruckRepository>().not.toMatchTypeOf<AggregateRepository<Warehouse>>();
    expectTypeOf<InMemoryWarehouseRepository>().toMatchTypeOf<AggregateRepository<Warehouse>>();
  });
});
