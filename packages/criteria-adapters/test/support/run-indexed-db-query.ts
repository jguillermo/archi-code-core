import type { SearchOptions, SearchResult } from '@archi-code/ddd/domain';
import type { IndexedDbQuery } from '../../src/indexeddb/indexed-db-query';

export async function runIndexedDbQuery<T>(
  store: IDBObjectStore,
  query: IndexedDbQuery<T>,
  options: SearchOptions = {},
): Promise<SearchResult<T>> {
  const source = query.index === null ? store : store.index(query.index);
  const end = query.limit === null ? Infinity : query.offset + query.limit;
  const stopsEarly = query.compare === null && options.withTotal !== true;
  const matched: T[] = [];
  await new Promise<void>((resolve, reject) => {
    const request = source.openCursor(query.range, query.direction);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor === null || (stopsEarly && matched.length >= end)) {
        resolve();
        return;
      }
      if (query.filter(cursor.value)) {
        matched.push(cursor.value as T);
      }
      cursor.continue();
    };
  });
  const sorted = query.compare === null ? matched : matched.sort(query.compare);
  const items = sorted.slice(query.offset, query.limit === null ? undefined : end);
  return options.withTotal === true ? { items, total: matched.length } : { items };
}
