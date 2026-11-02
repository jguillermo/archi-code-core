import { IndexedDbException } from '../exceptions/indexed-db.exception';

export type IndexedDbKeyPath = string | readonly string[];

export type IndexedDbMigration = (row: any) => object | null;

export interface IndexedDbIndexOptions {
  readonly keyPath: IndexedDbKeyPath;
  readonly unique?: boolean;
  readonly multiEntry?: boolean;
}

export interface IndexedDbSchemaOptions<Index extends string = string> {
  readonly version?: number;
  readonly indexes?: Readonly<Record<Index, IndexedDbIndexOptions>>;
  readonly migrations?: Readonly<Record<number, IndexedDbMigration>>;
}

export interface IndexedDbIndexDefinition {
  readonly name: string;
  readonly keyPath: IndexedDbKeyPath;
  readonly unique: boolean;
  readonly multiEntry: boolean;
}

export interface IndexedDbStoreDefinition {
  readonly name: string;
  readonly keyPath: IndexedDbKeyPath | null;
  readonly autoIncrement: boolean;
  readonly indexes: readonly IndexedDbIndexDefinition[];
}

export interface IndexedDbTableDefinition extends IndexedDbStoreDefinition {
  readonly keyPath: string;
  readonly version: number;
  readonly migrations: readonly (readonly [number, IndexedDbMigration])[];
}

export type IndexedDbDifferenceKind =
  | 'missing_store'
  | 'key_path'
  | 'auto_increment'
  | 'missing_index'
  | 'extra_index'
  | 'index_definition';

export interface IndexedDbDifference {
  readonly store: string;
  readonly kind: IndexedDbDifferenceKind;
  readonly index: string | null;
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface IndexedDbStorePlan {
  readonly table: IndexedDbTableDefinition;
  readonly create: boolean;
  readonly dropIndexes: readonly string[];
  readonly createIndexes: readonly IndexedDbIndexDefinition[];
  readonly migrateFrom: number | null;
  readonly record: boolean;
}

export class IndexedDbSchema {
  static readonly KEY_PATH = 'id';
  static readonly TABLES_STORE = '@archi-code/tables';

  static definitionOf(name: string, options: IndexedDbSchemaOptions): IndexedDbTableDefinition {
    if (typeof name !== 'string' || name === '') {
      throw new IndexedDbException('schema_mismatch', 'a table needs a non-empty name');
    }
    if (name === IndexedDbSchema.TABLES_STORE) {
      throw new IndexedDbException(
        'schema_mismatch',
        `"${name}" is the store where the tables keep their versions; pick another name`,
      );
    }
    const version = options.version ?? 1;
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new IndexedDbException(
        'schema_mismatch',
        `the version of table "${name}" must be a positive integer, received ${String(version)}`,
      );
    }
    const indexes = Object.entries<IndexedDbIndexOptions>(options.indexes ?? {})
      .map(([index, definition]) => IndexedDbSchema.indexDefinition(name, index, definition))
      .sort((left, right) => (left.name < right.name ? -1 : 1));
    return Object.freeze({
      name,
      keyPath: IndexedDbSchema.KEY_PATH,
      autoIncrement: false,
      indexes: Object.freeze(indexes),
      version,
      migrations: Object.freeze(IndexedDbSchema.migrationsOf(name, version, options.migrations)),
    });
  }

  static sameTable(left: IndexedDbTableDefinition, right: IndexedDbTableDefinition): boolean {
    return (
      left.version === right.version &&
      IndexedDbSchema.compare(left, right).length === 0 &&
      left.migrations.length === right.migrations.length &&
      left.migrations.every(([version], at) => right.migrations[at][0] === version)
    );
  }

  static read(store: IDBObjectStore): IndexedDbStoreDefinition {
    const indexes = Array.from(store.indexNames)
      .sort()
      .map((name) => {
        const index = store.index(name);
        return {
          name,
          keyPath: IndexedDbSchema.copyKeyPath(index.keyPath),
          unique: index.unique,
          multiEntry: index.multiEntry,
        };
      });
    return {
      name: store.name,
      keyPath: store.keyPath === null ? null : IndexedDbSchema.copyKeyPath(store.keyPath),
      autoIncrement: store.autoIncrement,
      indexes,
    };
  }

  static compare(
    expected: IndexedDbStoreDefinition,
    actual: IndexedDbStoreDefinition | null,
  ): IndexedDbDifference[] {
    const store = expected.name;
    if (actual === null) {
      return [{ store, kind: 'missing_store', index: null, expected, actual: null }];
    }
    const differences: IndexedDbDifference[] = [];
    if (!IndexedDbSchema.sameKeyPath(expected.keyPath, actual.keyPath)) {
      differences.push({
        store,
        kind: 'key_path',
        index: null,
        expected: expected.keyPath,
        actual: actual.keyPath,
      });
    }
    if (expected.autoIncrement !== actual.autoIncrement) {
      differences.push({
        store,
        kind: 'auto_increment',
        index: null,
        expected: expected.autoIncrement,
        actual: actual.autoIncrement,
      });
    }
    const actualIndexes = new Map(actual.indexes.map((index) => [index.name, index]));
    for (const index of expected.indexes) {
      const found = actualIndexes.get(index.name);
      if (found === undefined) {
        differences.push({
          store,
          kind: 'missing_index',
          index: index.name,
          expected: index,
          actual: null,
        });
      } else if (!IndexedDbSchema.sameIndex(index, found)) {
        differences.push({
          store,
          kind: 'index_definition',
          index: index.name,
          expected: index,
          actual: found,
        });
      }
      actualIndexes.delete(index.name);
    }
    for (const extra of Array.from(actualIndexes.values())) {
      differences.push({
        store,
        kind: 'extra_index',
        index: extra.name,
        expected: null,
        actual: extra,
      });
    }
    return differences;
  }

  static plan(
    table: IndexedDbTableDefinition,
    actual: IndexedDbStoreDefinition | null,
    recorded: number | undefined,
  ): IndexedDbStorePlan {
    const idle = {
      table,
      create: false,
      dropIndexes: [],
      createIndexes: [],
      migrateFrom: null,
      record: false,
    };
    if (actual === null) {
      return { ...idle, create: true, createIndexes: table.indexes, record: true };
    }
    if (!IndexedDbSchema.sameKeyPath(actual.keyPath, table.keyPath) || actual.autoIncrement) {
      throw new IndexedDbException(
        'schema_mismatch',
        `store "${table.name}" exists with another key: a table keeps its UUID in "${table.keyPath}" without autoIncrement, and IndexedDB cannot change the key of a store`,
      );
    }
    const current = recorded ?? 1;
    if (table.version < current) {
      return idle;
    }
    const differences = IndexedDbSchema.compare(table, actual);
    const named = (...kinds: IndexedDbDifferenceKind[]): string[] =>
      differences
        .filter((difference) => kinds.includes(difference.kind))
        .map((difference) => difference.index as string);
    const wanted = (names: readonly string[]): IndexedDbIndexDefinition[] =>
      table.indexes.filter((index) => names.includes(index.name));
    if (table.version === current) {
      const changed = named('index_definition');
      if (changed.length > 0) {
        throw new IndexedDbException(
          'schema_mismatch',
          `index "${changed[0]}" of table "${table.name}" changed: raise the version of the table so the upgrade rebuilds it`,
        );
      }
      return {
        ...idle,
        createIndexes: wanted(named('missing_index')),
        record: recorded === undefined,
      };
    }
    return {
      ...idle,
      dropIndexes: named('extra_index', 'index_definition'),
      createIndexes: wanted(named('missing_index', 'index_definition')),
      migrateFrom: current,
      record: true,
    };
  }

  static hasWork(plan: IndexedDbStorePlan): boolean {
    return (
      plan.create ||
      plan.dropIndexes.length > 0 ||
      plan.createIndexes.length > 0 ||
      plan.migrateFrom !== null ||
      plan.record
    );
  }

  static apply(
    database: IDBDatabase,
    transaction: IDBTransaction,
    plan: IndexedDbStorePlan,
  ): IDBObjectStore {
    const store = plan.create
      ? database.createObjectStore(plan.table.name, { keyPath: plan.table.keyPath })
      : transaction.objectStore(plan.table.name);
    plan.dropIndexes.forEach((name) => store.deleteIndex(name));
    for (const index of plan.createIndexes) {
      store.createIndex(index.name, IndexedDbSchema.nativeKeyPath(index.keyPath), {
        unique: index.unique,
        multiEntry: index.multiEntry,
      });
    }
    return store;
  }

  static sameKeyPath(left: IndexedDbKeyPath | null, right: IndexedDbKeyPath | null): boolean {
    if (typeof left === 'string' || left === null || typeof right === 'string' || right === null) {
      return left === right;
    }
    return left.length === right.length && left.every((part, at) => part === right[at]);
  }

  private static nativeKeyPath(keyPath: IndexedDbKeyPath): string | string[] {
    return typeof keyPath === 'string' ? keyPath : [...keyPath];
  }

  private static migrationsOf(
    table: string,
    version: number,
    migrations: Readonly<Record<number, IndexedDbMigration>> = {},
  ): (readonly [number, IndexedDbMigration])[] {
    const steps = Object.entries(migrations)
      .map(([key, migration]): readonly [number, IndexedDbMigration] => {
        const target = Number(key);
        if (!Number.isSafeInteger(target) || target < 2 || target > version) {
          throw new IndexedDbException(
            'schema_mismatch',
            `table "${table}" has a migration for version ${key}; migrations go from version 2 to ${version}`,
          );
        }
        if (typeof migration !== 'function') {
          throw new IndexedDbException(
            'schema_mismatch',
            `the migration of table "${table}" to version ${key} must be a function of the row`,
          );
        }
        return [target, migration];
      })
      .sort(([left], [right]) => left - right);
    const missing = Array.from({ length: version - 1 }, (_, at) => at + 2).filter(
      (target) => !steps.some(([step]) => step === target),
    );
    if (missing.length > 0) {
      throw new IndexedDbException(
        'schema_mismatch',
        `table "${table}" is at version ${version} but has no migration for version ${missing.join(', ')}: every version from 2 declares its own migration, so data of any older version reaches the last one step by step`,
      );
    }
    return steps;
  }

  private static indexDefinition(
    table: string,
    name: string,
    index: IndexedDbIndexOptions,
  ): IndexedDbIndexDefinition {
    const keyPath = IndexedDbSchema.copyKeyPath(index.keyPath);
    const multiEntry = index.multiEntry ?? false;
    if (multiEntry && Array.isArray(keyPath)) {
      throw new IndexedDbException(
        'schema_mismatch',
        `index "${name}" of table "${table}" cannot be multiEntry with a compound keyPath`,
      );
    }
    return Object.freeze({ name, keyPath, unique: index.unique ?? false, multiEntry });
  }

  private static sameIndex(
    left: IndexedDbIndexDefinition,
    right: IndexedDbIndexDefinition,
  ): boolean {
    return (
      IndexedDbSchema.sameKeyPath(left.keyPath, right.keyPath) &&
      left.unique === right.unique &&
      left.multiEntry === right.multiEntry
    );
  }

  private static copyKeyPath(keyPath: IndexedDbKeyPath): IndexedDbKeyPath {
    return typeof keyPath === 'string' ? keyPath : Object.freeze([...keyPath]);
  }
}
