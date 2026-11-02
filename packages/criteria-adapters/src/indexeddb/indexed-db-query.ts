import type { Criteria } from '@archi-code/criteria';
import { compareBy, matchesFilter } from '../memory/index';
import { IndexedDbKey, IndexInfo, KeyBounds, planIndexedDbQuery } from './plan-query';

export interface IndexedDbQuery<T> {
  readonly index: string | null;
  readonly range: IDBKeyRange | null;
  readonly direction: 'next' | 'prev';
  readonly filter: (record: unknown) => boolean;
  readonly compare: ((left: T, right: T) => number) | null;
  readonly offset: number;
  readonly limit: number | null;
}

function keyRange(bounds: KeyBounds): IDBKeyRange {
  if (bounds.lower !== undefined && bounds.upper !== undefined) {
    return IDBKeyRange.bound(bounds.lower, bounds.upper, bounds.lowerOpen, bounds.upperOpen);
  }
  if (bounds.lower !== undefined) {
    return IDBKeyRange.lowerBound(bounds.lower, bounds.lowerOpen);
  }
  return IDBKeyRange.upperBound(bounds.upper as IndexedDbKey, bounds.upperOpen);
}

export function toIndexedDbQuery<T>(
  criteria: Criteria<T>,
  indexes: readonly IndexInfo[],
): IndexedDbQuery<T> {
  const plan = planIndexedDbQuery(criteria as Criteria<unknown>, indexes);
  const filter = criteria.filter;
  return {
    index: plan.index,
    range: plan.bounds === null ? null : keyRange(plan.bounds),
    direction: plan.direction,
    filter: (record) => matchesFilter(record, filter),
    compare: plan.presorted ? null : compareBy<T>(criteria.order),
    offset: criteria.pagination?.offset ?? 0,
    limit: criteria.pagination?.limit ?? null,
  };
}
