import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbConnections } from './indexed-db-connections';
import { IndexedDbSchema } from './indexed-db-schema';
import type { IndexedDbDifference, IndexedDbStoreDefinition } from './indexed-db-schema';
import { IndexedDbTransaction } from './indexed-db-transaction';

export interface IndexedDbInspectorOptions {
  readonly database: string;
  readonly factory?: IDBFactory;
}

export interface IndexedDbStoreStructure extends IndexedDbStoreDefinition {
  readonly tableVersion: number | null;
}

export interface IndexedDbStructure {
  readonly name: string;
  readonly version: number;
  readonly stores: readonly IndexedDbStoreStructure[];
}

export interface IndexedDbIndexStatistics {
  readonly name: string;
  readonly entries: number;
  readonly distinctKeys: number;
  readonly firstKey: IDBValidKey | null;
  readonly lastKey: IDBValidKey | null;
}

export interface IndexedDbStoreStatistics {
  readonly name: string;
  readonly records: number;
  readonly firstKey: IDBValidKey | null;
  readonly lastKey: IDBValidKey | null;
  readonly indexes: readonly IndexedDbIndexStatistics[];
}

export interface IndexedDbStatistics {
  readonly name: string;
  readonly version: number;
  readonly stores: readonly IndexedDbStoreStatistics[];
}

export interface IndexedDbDatabaseInfo {
  readonly name: string;
  readonly version: number;
}

export interface IndexedDbStorageInfo {
  readonly usage: number | null;
  readonly quota: number | null;
  readonly persisted: boolean | null;
}

interface StorageManagerLike {
  estimate?(): Promise<{ usage?: number; quota?: number }>;
  persisted?(): Promise<boolean>;
  persist?(): Promise<boolean>;
}

export class IndexedDbInspector {
  readonly database: string;
  private readonly factory: IDBFactory;

  constructor({ database, factory }: IndexedDbInspectorOptions) {
    if (typeof database !== 'string' || database === '') {
      throw new IndexedDbException('schema_mismatch', 'a database needs a non-empty name');
    }
    this.factory = IndexedDbConnections.factory(factory);
    this.database = database;
  }

  static async databases(factory?: IDBFactory): Promise<IndexedDbDatabaseInfo[]> {
    const resolved = IndexedDbConnections.factory(factory);
    /* v8 ignore next 3 -- @preserve: Chromium always lists its databases; older Firefox did not */
    if (typeof resolved.databases !== 'function') {
      throw new IndexedDbException('unavailable', 'this browser cannot list its databases');
    }
    const databases = await resolved.databases();
    /* v8 ignore start -- @preserve: browsers always give the name and version of a database */
    return databases
      .filter((info): info is { name: string; version: number } => typeof info.name === 'string')
      .map(({ name, version }) => ({ name, version: version ?? 0 }))
      .sort((left, right) => (left.name < right.name ? -1 : 1));
    /* v8 ignore stop -- @preserve */
  }

  static async storage(): Promise<IndexedDbStorageInfo> {
    const manager = IndexedDbInspector.storageManager();
    const estimate =
      typeof manager?.estimate === 'function'
        ? await manager.estimate()
        : ({} as { usage?: number; quota?: number });
    const persisted = typeof manager?.persisted === 'function' ? await manager.persisted() : null;
    return { usage: estimate.usage ?? null, quota: estimate.quota ?? null, persisted };
  }

  static async persist(): Promise<boolean> {
    const manager = IndexedDbInspector.storageManager();
    if (typeof manager?.persist !== 'function') {
      throw new IndexedDbException(
        'unavailable',
        'this environment cannot ask for persistent storage',
      );
    }
    return manager.persist();
  }

  async exists(): Promise<boolean> {
    return (await this.structure()) !== null;
  }

  structure(): Promise<IndexedDbStructure | null> {
    return this.read(async (opened) => {
      const versions = await IndexedDbConnections.versions(opened);
      return {
        name: opened.name,
        version: opened.version,
        stores: IndexedDbInspector.storeNames(opened).map((store) => ({
          ...IndexedDbSchema.read(opened.transaction(store, 'readonly').objectStore(store)),
          tableVersion: versions.get(store) ?? null,
        })),
      };
    });
  }

  async store(name: string): Promise<IndexedDbStoreStructure | null> {
    const structure = await this.structure();
    return structure?.stores.find((store) => store.name === name) ?? null;
  }

  statistics(): Promise<IndexedDbStatistics | null> {
    return this.read(async (opened) => {
      const stores: IndexedDbStoreStatistics[] = [];
      for (const store of IndexedDbInspector.storeNames(opened)) {
        stores.push(await this.storeStatistics(opened, store));
      }
      return { name: opened.name, version: opened.version, stores };
    });
  }

  sample(store: string, limit = 10): Promise<unknown[]> {
    if (!Number.isSafeInteger(limit) || limit < 0) {
      return Promise.reject(
        new IndexedDbException(
          'invalid_query',
          `limit must be a whole number of 0 or more, received ${String(limit)}`,
        ),
      );
    }
    return this.read(
      (opened) =>
        IndexedDbTransaction.run(
          opened,
          [this.existingStore(opened, store)],
          'readonly',
          'default',
          (transaction) =>
            limit === 0
              ? []
              : IndexedDbTransaction.request<unknown[]>(
                  transaction.objectStore(store).getAll(null, limit),
                  `cannot sample store "${store}"`,
                ),
        ),
      [],
    );
  }

  async compare(): Promise<IndexedDbDifference[]> {
    const wanted = IndexedDbConnections.declared(this.factory, this.database);
    const structure = await this.structure();
    const actual = new Map((structure?.stores ?? []).map((store) => [store.name, store]));
    return wanted.flatMap((definition) =>
      IndexedDbSchema.compare(definition, actual.get(definition.name) ?? null),
    );
  }

  private async read<T>(work: (opened: IDBDatabase) => Promise<T>): Promise<T | null>;
  private async read<T>(work: (opened: IDBDatabase) => Promise<T>, missing: T): Promise<T>;
  private async read<T>(
    work: (opened: IDBDatabase) => Promise<T>,
    missing: T | null = null,
  ): Promise<T | null> {
    const opened = await IndexedDbConnections.openExisting(this.factory, this.database);
    if (opened === null) {
      return missing;
    }
    try {
      return await work(opened);
    } finally {
      opened.close();
    }
  }

  private existingStore(opened: IDBDatabase, store: string): string {
    if (!IndexedDbInspector.storeNames(opened).includes(store)) {
      throw new IndexedDbException(
        'schema_mismatch',
        `database "${this.database}" has no store "${store}"`,
      );
    }
    return store;
  }

  private storeStatistics(opened: IDBDatabase, store: string): Promise<IndexedDbStoreStatistics> {
    return IndexedDbTransaction.run(opened, [store], 'readonly', 'default', async (transaction) => {
      const objectStore = transaction.objectStore(store);
      const context = `cannot read the statistics of store "${store}"`;
      const indexNames = Array.from(objectStore.indexNames).sort();
      const [records, edges, indexes] = await Promise.all([
        IndexedDbTransaction.request(objectStore.count(), context),
        IndexedDbInspector.edges(objectStore, context),
        Promise.all(
          indexNames.map(async (name): Promise<IndexedDbIndexStatistics> => {
            const index = objectStore.index(name);
            let distinctKeys = 0;
            const [entries, indexEdges] = await Promise.all([
              IndexedDbTransaction.request(index.count(), context),
              IndexedDbInspector.edges(index, context),
              IndexedDbTransaction.walk(
                index.openKeyCursor(null, 'nextunique'),
                context,
                (cursor) => {
                  distinctKeys += 1;
                  cursor.continue();
                  return true;
                },
              ),
            ]);
            return { name, entries, distinctKeys, ...indexEdges };
          }),
        ),
      ]);
      return { name: store, records, ...edges, indexes };
    });
  }

  private static async edges(
    source: IDBObjectStore | IDBIndex,
    context: string,
  ): Promise<{ firstKey: IDBValidKey | null; lastKey: IDBValidKey | null }> {
    const [first, last] = await Promise.all([
      IndexedDbTransaction.request(source.openKeyCursor(null, 'next'), context),
      IndexedDbTransaction.request(source.openKeyCursor(null, 'prev'), context),
    ]);
    return { firstKey: first?.key ?? null, lastKey: last?.key ?? null };
  }

  private static storeNames(opened: IDBDatabase): string[] {
    return Array.from(opened.objectStoreNames)
      .filter((store) => store !== IndexedDbSchema.TABLES_STORE)
      .sort();
  }

  private static storageManager(): StorageManagerLike | undefined {
    return (globalThis as { navigator?: { storage?: StorageManagerLike } }).navigator?.storage;
  }
}
