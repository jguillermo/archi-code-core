function settle(request: IDBOpenDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function anotherPage(): IDBFactory {
  const real = globalThis.indexedDB;
  return {
    open: real.open.bind(real),
    deleteDatabase: real.deleteDatabase.bind(real),
    cmp: real.cmp.bind(real),
    databases: real.databases.bind(real),
  } as IDBFactory;
}

export async function freshIndexedDb(): Promise<IDBFactory> {
  const real = globalThis.indexedDB;
  for (const { name } of await real.databases()) {
    if (name !== undefined) {
      await settle(real.deleteDatabase(name));
    }
  }
  return anotherPage();
}

export function openDatabase(
  factory: IDBFactory,
  name: string,
  version?: number,
  upgrade: (database: IDBDatabase, transaction: IDBTransaction) => void = () => undefined,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = () => upgrade(request.result, request.transaction as IDBTransaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
