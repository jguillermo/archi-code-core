import type { AggregateRoot } from '../aggregate/aggregate-root';

export abstract class AggregateRepository<Aggregate extends AggregateRoot<any>> {
  declare protected readonly aggregateBrand: Aggregate;
}
