import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateFinder<Aggregate extends AggregateRoot<any>> {
  findById(id: Aggregate['id']): Promise<Aggregate | null>;
}
