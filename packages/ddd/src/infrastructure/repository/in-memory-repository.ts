import type { AggregateFinder, AggregateRemover, AggregateSaver } from '../../application';
import type { AggregateRoot } from '../../domain';

export interface AggregateMapper<Aggregate, Primitives> {
  toPrimitives(aggregate: Aggregate): Primitives;
  fromPrimitives(primitives: Primitives): Aggregate;
}

export class InMemoryRepository<Aggregate extends AggregateRoot<any, any>, Primitives>
  implements AggregateFinder<Aggregate>, AggregateSaver<Aggregate>, AggregateRemover<Aggregate>
{
  private readonly rows = new Map<string, Primitives>();

  constructor(private readonly mapper: AggregateMapper<Aggregate, Primitives>) {}

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
