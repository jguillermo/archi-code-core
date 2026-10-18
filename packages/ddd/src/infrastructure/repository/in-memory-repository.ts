import type { AggregateFinder, AggregateRemover, AggregateSaver } from '../../application/index';
import type { AggregateRoot, PrimitiveTypes } from '../../domain/index';
import type { AggregateMapper } from './aggregate-mapper';

export class InMemoryRepository<
  Aggregate extends AggregateRoot<any, any> & { toPrimitives(): PrimitiveTypes<Aggregate> },
>
  implements AggregateFinder<Aggregate>, AggregateSaver<Aggregate>, AggregateRemover<Aggregate>
{
  private readonly rows = new Map<string, PrimitiveTypes<Aggregate>>();

  constructor(private readonly mapper: AggregateMapper<Aggregate>) {}

  async findById(id: Aggregate['id']): Promise<Aggregate | null> {
    const row = this.rows.get(id.toString());
    return row === undefined ? null : this.mapper.fromPrimitives(structuredClone(row));
  }

  async findAll(): Promise<Aggregate[]> {
    return Array.from(this.rows.values(), (row) =>
      this.mapper.fromPrimitives(structuredClone(row)),
    );
  }

  async save(aggregate: Aggregate): Promise<void> {
    this.rows.set(aggregate.id.toString(), structuredClone(this.mapper.toPrimitives(aggregate)));
  }

  async delete(id: Aggregate['id']): Promise<void> {
    this.rows.delete(id.toString());
  }
}
