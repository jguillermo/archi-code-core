import { IndexInfo } from './plan-query';

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
