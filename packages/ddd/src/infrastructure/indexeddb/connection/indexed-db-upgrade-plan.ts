import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import type { IndexedDbIndexDefinition, IndexedDbSchema } from '../indexed-db-schema';

export type IndexedDbMigration = (row: any) => object | null;

export interface IndexedDbMigrationStep {
  readonly version: number;
  readonly table: string;
  readonly migrate: IndexedDbMigration;
}

export interface IndexedDbIndexChanges {
  readonly remove: readonly string[];
  readonly create: readonly (readonly [string, IndexedDbIndexDefinition])[];
}

export class IndexedDbUpgradePlan {
  static indexes(store: IDBObjectStore, schema: IndexedDbSchema<any, any>): IndexedDbIndexChanges {
    if (store.keyPath !== 'id' || store.autoIncrement) {
      throw new IndexedDbException(
        'schema_mismatch',
        `store "${store.name}" exists with another key: a table keeps its id in "id" without autoIncrement`,
      );
    }
    const remove = Array.from(store.indexNames).filter((name) => {
      const wanted = schema.indexes.get(name);
      return wanted === undefined || !IndexedDbUpgradePlan.same(store.index(name), wanted);
    });
    const create = Array.from(schema.indexes).filter(
      ([name]) => !store.indexNames.contains(name) || remove.includes(name),
    );
    return { remove, create };
  }

  static migrations(
    steps: readonly IndexedDbMigrationStep[],
    recorded: number,
  ): readonly IndexedDbMigrationStep[] {
    return recorded === 0 ? [] : steps.filter((step) => step.version > recorded);
  }

  private static same(index: IDBIndex, wanted: IndexedDbIndexDefinition): boolean {
    const actual = index.keyPath;
    const sameKeyPath =
      typeof actual === 'string' || typeof wanted.keyPath === 'string'
        ? actual === wanted.keyPath
        : actual.length === wanted.keyPath.length &&
          actual.every((part, at) => part === wanted.keyPath[at]);
    return sameKeyPath && index.unique === wanted.unique && index.multiEntry === wanted.multiEntry;
  }
}
