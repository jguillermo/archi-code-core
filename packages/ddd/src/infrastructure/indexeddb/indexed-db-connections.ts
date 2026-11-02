import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbSchema } from './indexed-db-schema';
import type { IndexedDbMigration, IndexedDbTableDefinition } from './indexed-db-schema';
import { IndexedDbTransaction } from './indexed-db-transaction';
import type { IndexedDbDurability } from './indexed-db-transaction';

interface DatabaseEntry {
  readonly name: string;
  readonly factory: IDBFactory;
  readonly tables: Map<string, IndexedDbTableDefinition>;
  readonly verified: Set<string>;
  connection: Promise<IDBDatabase> | null;
  opened: IDBDatabase | null;
}

interface TableRecord {
  readonly table: string;
  readonly version: number;
}

type Upgrade = (database: IDBDatabase, transaction: IDBTransaction) => Promise<void>;

export class IndexedDbConnections {
  private static readonly registries = new WeakMap<IDBFactory, Map<string, DatabaseEntry>>();
  private static readonly live = new Set<DatabaseEntry>();
  private static listening = false;

  static factory(factory: IDBFactory | undefined): IDBFactory {
    const resolved = factory ?? (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (resolved === undefined || resolved === null) {
      throw new IndexedDbException('unavailable', 'this environment has no indexedDB');
    }
    if (typeof (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange !== 'function') {
      throw new IndexedDbException('unavailable', 'this environment has no IDBKeyRange');
    }
    return resolved;
  }

  static register(factory: IDBFactory, database: string, table: IndexedDbTableDefinition): void {
    const databases = IndexedDbConnections.databasesOf(factory);
    const entry = databases.get(database) ?? {
      name: database,
      factory,
      tables: new Map<string, IndexedDbTableDefinition>(),
      verified: new Set<string>(),
      connection: null,
      opened: null,
    };
    entry.tables.set(table.name, table);
    databases.set(database, entry);
  }

  static declared(factory: IDBFactory, database: string): IndexedDbTableDefinition[] {
    const entry = IndexedDbConnections.databasesOf(factory).get(database);
    return entry === undefined ? [] : Array.from(entry.tables.values());
  }

  static async run<T>(
    factory: IDBFactory,
    database: string,
    stores: readonly string[],
    mode: IDBTransactionMode,
    durability: IndexedDbDurability,
    work: (transaction: IDBTransaction) => Promise<T> | T,
  ): Promise<T> {
    const entry = IndexedDbConnections.databasesOf(factory).get(database) as DatabaseEntry;
    for (;;) {
      const pending = IndexedDbConnections.connection(entry);
      const opened = await pending;
      if (entry.connection !== pending) {
        continue;
      }
      if (!stores.every((store) => entry.verified.has(store))) {
        IndexedDbConnections.release(entry);
        continue;
      }
      return IndexedDbTransaction.run(opened, stores, mode, durability, work);
    }
  }

  static close(factory: IDBFactory, database: string): void {
    const entry = IndexedDbConnections.databasesOf(factory).get(database);
    if (entry !== undefined) {
      IndexedDbConnections.release(entry);
    }
  }

  static async deleteDatabase(factory: IDBFactory, database: string): Promise<void> {
    IndexedDbConnections.close(factory, database);
    await new Promise<void>((resolve, reject) => {
      const request = factory.deleteDatabase(database);
      request.onblocked = () =>
        reject(
          new IndexedDbException(
            'blocked',
            `database "${database}" is still open elsewhere: close it before deleting it`,
          ),
        );
      /* v8 ignore next 2 -- @preserve: browsers only fail a delete on a broken disk */
      request.onerror = () =>
        reject(IndexedDbTransaction.failure(request.error, `cannot delete database "${database}"`));
      request.onsuccess = () => resolve();
    });
  }

  static async drop(factory: IDBFactory, database: string, store: string): Promise<boolean> {
    if (IndexedDbConnections.declared(factory, database).some((table) => table.name === store)) {
      throw new IndexedDbException(
        'schema_mismatch',
        `table "${store}" is still declared in database "${database}": a declared table cannot be dropped`,
      );
    }
    if (store === IndexedDbSchema.TABLES_STORE) {
      throw new IndexedDbException(
        'schema_mismatch',
        `"${store}" keeps the versions of the tables and cannot be dropped`,
      );
    }
    IndexedDbConnections.close(factory, database);
    const existing = await IndexedDbConnections.openExisting(factory, database);
    if (existing === null) {
      return false;
    }
    const version = existing.version + 1;
    const found = existing.objectStoreNames.contains(store);
    existing.close();
    if (!found) {
      return false;
    }
    const opened = await IndexedDbConnections.request(
      factory,
      database,
      version,
      async (upgraded, transaction) => {
        upgraded.deleteObjectStore(store);
        if (upgraded.objectStoreNames.contains(IndexedDbSchema.TABLES_STORE)) {
          transaction.objectStore(IndexedDbSchema.TABLES_STORE).delete(store);
        }
      },
    );
    opened.close();
    return true;
  }

  static openExisting(factory: IDBFactory, database: string): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      let created = false;
      const request = factory.open(database);
      request.onupgradeneeded = (event) => {
        created = event.oldVersion === 0;
        request.transaction?.abort();
      };
      request.onsuccess = () => {
        const opened = request.result;
        opened.onversionchange = () => opened.close();
        resolve(opened);
      };
      request.onerror = (event) => {
        event.preventDefault();
        /* v8 ignore else -- @preserve: opening an existing database without a version only fails on a broken disk */
        if (created) {
          resolve(null);
        } else {
          reject(IndexedDbTransaction.failure(request.error, `cannot open database "${database}"`));
        }
      };
    });
  }

  static async versions(opened: IDBDatabase): Promise<Map<string, number>> {
    if (!opened.objectStoreNames.contains(IndexedDbSchema.TABLES_STORE)) {
      return new Map();
    }
    return IndexedDbTransaction.run(
      opened,
      [IndexedDbSchema.TABLES_STORE],
      'readonly',
      'default',
      (transaction) =>
        IndexedDbConnections.records(transaction.objectStore(IndexedDbSchema.TABLES_STORE)),
    );
  }

  private static connection(entry: DatabaseEntry): Promise<IDBDatabase> {
    if (entry.connection !== null) {
      return entry.connection;
    }
    const pending: Promise<IDBDatabase> = IndexedDbConnections.connect(entry).then(
      ({ opened, tables }) => {
        if (entry.connection !== pending) {
          opened.close();
          return opened;
        }
        entry.opened = opened;
        tables.forEach((table) => entry.verified.add(table));
        IndexedDbConnections.live.add(entry);
        IndexedDbConnections.listen();
        return opened;
      },
    );
    entry.connection = pending;
    entry.verified.clear();
    pending.catch(() => {
      if (entry.connection === pending) {
        entry.connection = null;
      }
    });
    return pending;
  }

  private static async connect(
    entry: DatabaseEntry,
  ): Promise<{ opened: IDBDatabase; tables: string[] }> {
    const upgrade: Upgrade = (database, transaction) =>
      IndexedDbConnections.upgrade(database, transaction, Array.from(entry.tables.values()));
    let opened = await IndexedDbConnections.request(entry.factory, entry.name, undefined, upgrade);
    for (;;) {
      IndexedDbConnections.watch(entry, opened);
      const tables = Array.from(entry.tables.values());
      let pending: boolean;
      try {
        pending = await IndexedDbConnections.pending(opened, tables);
      } catch (error) {
        opened.close();
        throw error;
      }
      if (!pending) {
        return { opened, tables: tables.map((table) => table.name) };
      }
      const version = opened.version + 1;
      opened.close();
      try {
        opened = await IndexedDbConnections.request(entry.factory, entry.name, version, upgrade);
      } catch (error) {
        /* v8 ignore start -- @preserve: another tab raised the version between our check and our upgrade */
        if ((error as { cause?: { name?: string } }).cause?.name === 'VersionError') {
          opened = await IndexedDbConnections.request(
            entry.factory,
            entry.name,
            undefined,
            upgrade,
          );
          continue;
        }
        /* v8 ignore stop -- @preserve */
        throw error;
      }
    }
  }

  private static async pending(
    opened: IDBDatabase,
    tables: readonly IndexedDbTableDefinition[],
  ): Promise<boolean> {
    if (!opened.objectStoreNames.contains(IndexedDbSchema.TABLES_STORE)) {
      return true;
    }
    const existing = tables
      .map((table) => table.name)
      .filter((name) => opened.objectStoreNames.contains(name));
    return IndexedDbTransaction.run(
      opened,
      [IndexedDbSchema.TABLES_STORE, ...existing],
      'readonly',
      'default',
      async (transaction) => {
        const records = await IndexedDbConnections.records(
          transaction.objectStore(IndexedDbSchema.TABLES_STORE),
        );
        return tables.some((table) =>
          IndexedDbSchema.hasWork(
            IndexedDbSchema.plan(
              table,
              existing.includes(table.name)
                ? IndexedDbSchema.read(transaction.objectStore(table.name))
                : null,
              records.get(table.name),
            ),
          ),
        );
      },
    );
  }

  private static async upgrade(
    database: IDBDatabase,
    transaction: IDBTransaction,
    tables: readonly IndexedDbTableDefinition[],
  ): Promise<void> {
    const versions = database.objectStoreNames.contains(IndexedDbSchema.TABLES_STORE)
      ? transaction.objectStore(IndexedDbSchema.TABLES_STORE)
      : database.createObjectStore(IndexedDbSchema.TABLES_STORE, { keyPath: 'table' });
    const records = await IndexedDbConnections.records(versions);
    for (const table of tables) {
      const plan = IndexedDbSchema.plan(
        table,
        database.objectStoreNames.contains(table.name)
          ? IndexedDbSchema.read(transaction.objectStore(table.name))
          : null,
        records.get(table.name),
      );
      if (!IndexedDbSchema.hasWork(plan)) {
        continue;
      }
      const store = IndexedDbSchema.apply(database, transaction, plan);
      const from = plan.migrateFrom;
      const steps =
        from === null
          ? []
          : table.migrations.filter(([version]) => version > from && version <= table.version);
      for (const step of steps) {
        await IndexedDbConnections.migrate(store, step);
      }
      const record: TableRecord = { table: table.name, version: table.version };
      versions.put(record);
    }
  }

  private static migrate(
    store: IDBObjectStore,
    [version, migration]: readonly [number, IndexedDbMigration],
  ): Promise<void> {
    const context = `the migration of table "${store.name}" to version ${version} failed`;
    return IndexedDbTransaction.walk(store.openCursor(), context, (cursor) => {
      let row: object | null;
      try {
        row = migration(cursor.value);
      } catch (error) {
        throw new IndexedDbException('request_failed', context, { cause: error });
      }
      try {
        if (row === null) {
          cursor.delete();
        } else {
          cursor.update(row);
        }
      } catch (error) {
        throw IndexedDbTransaction.failure(
          error,
          `the migration of table "${store.name}" to version ${version} wrote a row IndexedDB refuses`,
        );
      }
      cursor.continue();
      return true;
    });
  }

  private static async records(store: IDBObjectStore): Promise<Map<string, number>> {
    const rows = await IndexedDbTransaction.request<TableRecord[]>(
      store.getAll(),
      'cannot read the versions of the tables',
    );
    return new Map(rows.map((row) => [row.table, row.version]));
  }

  private static request(
    factory: IDBFactory,
    database: string,
    version: number | undefined,
    upgrade: Upgrade,
  ): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let failure: IndexedDbException | null = null;
      let blocked = false;
      const context = `cannot upgrade database "${database}"`;
      const request =
        version === undefined ? factory.open(database) : factory.open(database, version);
      request.onupgradeneeded = () => {
        const transaction = request.transaction as IDBTransaction;
        transaction.onerror = (event) => {
          failure ??= IndexedDbTransaction.failure((event.target as IDBRequest).error, context);
        };
        upgrade(request.result, transaction).catch((error: unknown) => {
          failure ??= IndexedDbTransaction.failure(error, context);
          try {
            transaction.abort();
          } catch {
            /* v8 ignore next -- @preserve: the failed request already aborted the upgrade */
          }
        });
      };
      request.onblocked = () => {
        blocked = true;
        reject(
          new IndexedDbException(
            'blocked',
            `database "${database}" is open elsewhere with an older version: close it so the upgrade can run`,
          ),
        );
      };
      request.onsuccess = () => {
        const opened = request.result;
        if (blocked) {
          opened.close();
          return;
        }
        resolve(opened);
      };
      request.onerror = (event) => {
        event.preventDefault();
        /* v8 ignore else -- @preserve: an open fails without an upgrade failure only on a VersionError from another tab or a broken disk */
        if (failure !== null) {
          reject(failure);
        } else {
          reject(IndexedDbTransaction.failure(request.error, `cannot open database "${database}"`));
        }
      };
    });
  }

  private static watch(entry: DatabaseEntry, opened: IDBDatabase): void {
    const forget = (): void => {
      opened.close();
      /* v8 ignore else -- @preserve: only another tab upgrading while this connection is still being checked */
      if (entry.opened === opened) {
        IndexedDbConnections.release(entry);
      }
    };
    opened.onversionchange = forget;
    opened.onclose = forget;
  }

  private static release(entry: DatabaseEntry): void {
    const opened = entry.opened;
    entry.connection = null;
    entry.opened = null;
    entry.verified.clear();
    IndexedDbConnections.live.delete(entry);
    opened?.close();
  }

  private static listen(): void {
    const target = globalThis as {
      addEventListener?: (type: string, listener: () => void) => void;
    };
    if (IndexedDbConnections.listening || typeof target.addEventListener !== 'function') {
      return;
    }
    IndexedDbConnections.listening = true;
    target.addEventListener('pagehide', () => {
      Array.from(IndexedDbConnections.live).forEach((entry) => IndexedDbConnections.release(entry));
    });
  }

  private static databasesOf(factory: IDBFactory): Map<string, DatabaseEntry> {
    let databases = IndexedDbConnections.registries.get(factory);
    if (databases === undefined) {
      databases = new Map();
      IndexedDbConnections.registries.set(factory, databases);
    }
    return databases;
  }
}
