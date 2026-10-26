import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateRemover<Aggregate extends AggregateRoot<any>> {
  remove(aggregate: Aggregate): Promise<void>;
}
