import type { Criteria, SearchOptions, SearchResult } from '@archi-code/criteria';
import { compareBy } from './compare-by';
import { matches } from './matches';

export function searchMemory<T>(
  items: readonly T[],
  criteria: Criteria<T>,
  options: SearchOptions = {},
): SearchResult<T> {
  const matched = items.filter((item) => matches(item, criteria));
  const sorted = criteria.order.length === 0 ? matched : matched.sort(compareBy<T>(criteria.order));
  const offset = criteria.pagination?.offset ?? 0;
  const limit = criteria.pagination?.limit ?? null;
  const page = sorted.slice(offset, limit === null ? undefined : offset + limit);
  return options.withTotal === true ? { items: page, total: matched.length } : { items: page };
}
