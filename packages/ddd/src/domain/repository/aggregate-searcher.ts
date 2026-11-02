import type { AggregateRoot } from '../aggregate/aggregate-root';
import type { Criteria, CriteriaAggregate, SearchOptions, SearchResult } from '../../shared/index';

export interface AggregateSearcher<Aggregate extends AggregateRoot<any> & CriteriaAggregate> {
  search(criteria: Criteria<Aggregate>, options?: SearchOptions): Promise<SearchResult<Aggregate>>;
}
