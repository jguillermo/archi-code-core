import type { Criteria, SearchOptions, SearchResult } from '@archi-code/criteria';
import { compareBy, matchesFilter } from '@archi-code/criteria-memory';
import { IndexedDbKey, IndexInfo, KeyBounds, planIndexedDbQuery } from './plan-query';

export function readIndexes(store: IDBObjectStore): IndexInfo[] {
  const indexes: IndexInfo[] = [];
  if (typeof store.keyPath === 'string' && store.keyPath !== '') {
    indexes.push({ name: null, keyPath: store.keyPath });
  }
  for (const name of Array.from(store.indexNames)) {
    const index = store.index(name);
    if (typeof index.keyPath === 'string' && !index.multiEntry) {
      indexes.push({ name, keyPath: index.keyPath });
    }
  }
  return indexes;
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

function iterate(
  source: IDBObjectStore | IDBIndex,
  range: IDBKeyRange | null,
  direction: IDBCursorDirection,
  visit: (value: unknown) => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = source.openCursor(range, direction);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor === null || !visit(cursor.value)) {
        resolve();
        return;
      }
      cursor.continue();
    };
  });
}

export async function searchIndexedDb<T>(
  store: IDBObjectStore,
  criteria: Criteria<T>,
  options: SearchOptions = {},
): Promise<SearchResult<T>> {
  const plan = planIndexedDbQuery(criteria as Criteria<unknown>, readIndexes(store));
  const source = plan.index === null ? store : store.index(plan.index);
  const offset = criteria.pagination?.offset ?? 0;
  const limit = criteria.pagination?.limit ?? null;
  const withTotal = options.withTotal === true;
  const keep = plan.presorted && limit !== null ? offset + limit : Infinity;
  const matched: T[] = [];
  let total = 0;
  await iterate(source, plan.bounds && keyRange(plan.bounds), plan.direction, (value) => {
    if (matchesFilter(value, criteria.filter)) {
      total++;
      if (matched.length < keep) {
        matched.push(value as T);
      }
    }
    return withTotal || matched.length < keep;
  });
  const sorted = plan.presorted ? matched : matched.sort(compareBy<T>(criteria.order));
  const items = sorted.slice(offset, limit === null ? undefined : offset + limit);
  return withTotal ? { items, total } : { items };
}
