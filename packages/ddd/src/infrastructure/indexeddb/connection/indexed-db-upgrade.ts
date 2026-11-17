import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import type { IndexedDbSchema } from '../indexed-db-schema';
import { IndexedDbRequest } from '../transaction/indexed-db-request';
import { IndexedDbTransaction } from '../transaction/indexed-db-transaction';
import { IndexedDbUpgradePlan } from './indexed-db-upgrade-plan';
import type { IndexedDbMigrationStep } from './indexed-db-upgrade-plan';

export interface IndexedDbUpgradeTarget {
  readonly name: string;
  readonly version: number;
  readonly schemas: readonly IndexedDbSchema<any, any>[];
  readonly migrations: readonly IndexedDbMigrationStep[];
}

export class IndexedDbUpgrade {
  static readonly store = '@archi-code/database';
  private static readonly key = 'data-version';

  static async pending(database: IDBDatabase, target: IndexedDbUpgradeTarget): Promise<boolean> {
    const names = database.objectStoreNames;
    const tables = target.schemas.map((schema) => schema.name);
    if (!names.contains(IndexedDbUpgrade.store) || tables.some((table) => !names.contains(table))) {
      return true;
    }
    return IndexedDbTransaction.run(
      database,
      [IndexedDbUpgrade.store, ...tables],
      'readonly',
      async (transaction) => {
        const meta = transaction.objectStore(IndexedDbUpgrade.store);
        const recorded = await IndexedDbUpgrade.recorded(meta, target);
        return (
          recorded < target.version ||
          target.schemas.some((schema) => {
            const store = transaction.objectStore(schema.name);
            const { remove, create } = IndexedDbUpgradePlan.indexes(store, schema);
            return remove.length + create.length > 0;
          })
        );
      },
    );
  }

  static async apply(
    database: IDBDatabase,
    transaction: IDBTransaction,
    target: IndexedDbUpgradeTarget,
  ): Promise<void> {
    const names = database.objectStoreNames;
    const open = (name: string): IDBObjectStore =>
      names.contains(name)
        ? transaction.objectStore(name)
        : database.createObjectStore(name, { keyPath: 'id' });
    const meta = open(IndexedDbUpgrade.store);
    const recorded = await IndexedDbUpgrade.recorded(meta, target);
    for (const step of IndexedDbUpgradePlan.migrations(target.migrations, recorded)) {
      if (names.contains(step.table)) {
        await IndexedDbUpgrade.migrate(transaction.objectStore(step.table), step);
      }
    }
    for (const schema of target.schemas) {
      const store = open(schema.name);
      const { remove, create } = IndexedDbUpgradePlan.indexes(store, schema);
      for (const index of remove) {
        store.deleteIndex(index);
      }
      for (const [index, { keyPath, unique, multiEntry }] of create) {
        store.createIndex(index, keyPath as string | string[], { unique, multiEntry });
      }
    }
    await IndexedDbRequest.result(
      () => meta.put({ id: IndexedDbUpgrade.key, version: target.version }),
      `cannot record version ${target.version} of database "${target.name}"`,
    );
  }

  private static async recorded(
    meta: IDBObjectStore,
    target: IndexedDbUpgradeTarget,
  ): Promise<number> {
    const row = await IndexedDbRequest.result<{ version: number } | undefined>(
      () => meta.get(IndexedDbUpgrade.key),
      `cannot read the version of database "${target.name}"`,
    );
    const recorded = row?.version ?? 0;
    if (recorded > target.version) {
      throw new IndexedDbException(
        'schema_mismatch',
        `database "${target.name}" holds data at version ${recorded}, newer than version ${target.version} of this code`,
      );
    }
    return recorded;
  }

  private static migrate(store: IDBObjectStore, step: IndexedDbMigrationStep): Promise<void> {
    return IndexedDbRequest.walk<IDBCursorWithValue>(
      () => store.openCursor(),
      `the migration of table "${store.name}" to version ${step.version} failed`,
      (cursor) => {
        const { rowVersion, ...row } = cursor.value as { rowVersion: number };
        const migrated = step.migrate(row);
        if (migrated === null) {
          cursor.delete();
        } else {
          cursor.update({ ...migrated, rowVersion });
        }
        cursor.continue();
        return true;
      },
    );
  }
}
