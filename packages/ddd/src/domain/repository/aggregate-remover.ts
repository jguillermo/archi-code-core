import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  remove(aggregate: Aggregate): Promise<void>;
}
