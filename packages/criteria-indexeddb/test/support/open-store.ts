import 'fake-indexeddb/auto';

export interface StoreSpec {
  readonly keyPath: string | null;
  readonly indexes?: readonly { name: string; keyPath: string | string[]; multiEntry?: boolean }[];
}

let databases = 0;

export async function openDatabase(
  spec: StoreSpec,
  records: readonly unknown[],
): Promise<IDBDatabase> {
  databases++;
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(`criteria-${databases}`, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(
        'records',
        spec.keyPath === null ? { autoIncrement: true } : { keyPath: spec.keyPath },
      );
      for (const index of spec.indexes ?? []) {
        store.createIndex(index.name, index.keyPath, { multiEntry: index.multiEntry ?? false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('records', 'readwrite');
    for (const record of records) {
      transaction.objectStore('records').add(record);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  return database;
}

export function readStore(database: IDBDatabase): IDBObjectStore {
  return database.transaction('records', 'readonly').objectStore('records');
}
