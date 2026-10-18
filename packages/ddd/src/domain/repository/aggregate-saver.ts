import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateSaver<Aggregate extends AggregateRoot<any, any>> {
  save(aggregate: Aggregate): Promise<void>;
}
