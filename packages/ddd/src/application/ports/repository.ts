import type { AggregateRoot } from '../../domain/index';

export interface AggregateFinder<Aggregate extends AggregateRoot<any, any>> {
  findById(id: Aggregate['id']): Promise<Aggregate | null>;
}

export interface AggregateSaver<Aggregate extends AggregateRoot<any, any>> {
  save(aggregate: Aggregate): Promise<void>;
}

export interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  delete(id: Aggregate['id']): Promise<void>;
}
