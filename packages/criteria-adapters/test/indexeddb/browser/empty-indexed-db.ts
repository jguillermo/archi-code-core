export async function emptyIndexedDb(): Promise<void> {
  for (const { name } of await indexedDB.databases()) {
    if (name !== undefined) {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}
