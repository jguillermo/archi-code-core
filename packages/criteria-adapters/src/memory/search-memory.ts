import type {
  Criteria,
  CriteriaAggregate,
  SearchOptions,
  SearchResult,
} from '@archi-code/ddd/domain';
import { compareBy } from './compare-by';
import { matchesFilter } from './matches';

interface Candidate<A> {
  readonly aggregate: A;
  readonly document: object;
}

export function searchMemory<A extends CriteriaAggregate>(
  aggregates: readonly A[],
  criteria: Criteria<A>,
  options: SearchOptions = {},
): SearchResult<A> {
  const matched = aggregates
    .map((aggregate): Candidate<A> => ({ aggregate, document: aggregate.toPrimitives() }))
    .filter((candidate) => matchesFilter(candidate.document, criteria.filter));
  const compare = compareBy<object>(criteria.order);
  const sorted =
    criteria.order.length === 0
      ? matched
      : matched.sort((left, right) => compare(left.document, right.document));
  const offset = criteria.pagination?.offset ?? 0;
  const limit = criteria.pagination?.limit ?? null;
  const page = sorted.slice(offset, limit === null ? undefined : offset + limit);
  const items = page.map((candidate) => candidate.aggregate);
  return options.withTotal === true ? { items, total: matched.length } : { items };
}
