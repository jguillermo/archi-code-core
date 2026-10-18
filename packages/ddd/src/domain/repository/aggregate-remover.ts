import type { AggregateRoot } from '../aggregate/aggregate-root';

export interface AggregateRemover<Aggregate extends AggregateRoot<any, any>> {
  delete(id: Aggregate['id']): Promise<void>;
}
