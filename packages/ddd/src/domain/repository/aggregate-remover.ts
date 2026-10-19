import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  remove(id: Aggregate['id']): Promise<void>;
}
