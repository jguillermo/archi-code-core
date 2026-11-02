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
