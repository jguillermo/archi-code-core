import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbConnection } from './connection/indexed-db-connection';
import type {
  IndexedDbMigration,
  IndexedDbMigrationStep,
} from './connection/indexed-db-upgrade-plan';
import type { IndexedDbRow, IndexedDbSchema } from './indexed-db-schema';
import { IndexedDbTable } from './indexed-db-table';

export interface IndexedDbDatabaseOptions {
  readonly name: string;
  readonly version?: number;
  readonly migrations?: Readonly<Record<number, Readonly<Record<string, IndexedDbMigration>>>>;
  readonly idleTimeout?: number | null;
  readonly openTimeout?: number;
  readonly factory?: IDBFactory;
}

interface DeclaredTable {
  readonly schema: IndexedDbSchema<any, any>;
  readonly table: IndexedDbTable<any, any>;
}

export class IndexedDbDatabase {
  readonly name: string;
  readonly version: number;
  private readonly tables = new Map<string, DeclaredTable>();
  private readonly connection: IndexedDbConnection;

  constructor({
    name,
    version = 1,
    migrations = {},
    idleTimeout = 30_000,
    openTimeout = 10_000,
    factory,
  }: IndexedDbDatabaseOptions) {
    if (typeof name !== 'string' || name === '') {
      throw new IndexedDbException('invalid_schema', 'a database needs a non-empty name');
    }
    const invalid = (message: string): IndexedDbException =>
      new IndexedDbException('invalid_schema', `database "${name}": ${message}`);
    if (!Number.isSafeInteger(version) || version < 1) {
      throw invalid(`the version is a positive integer, received ${String(version)}`);
    }
    if (
      (idleTimeout !== null && !IndexedDbDatabase.isDelay(idleTimeout)) ||
      !IndexedDbDatabase.isDelay(openTimeout)
    ) {
      throw invalid('idleTimeout (or null) and openTimeout are milliseconds, zero or more');
    }
    const steps: IndexedDbMigrationStep[] = Object.entries(migrations)
      .flatMap(([target, tables]) =>
        Object.entries(tables).map(([table, migrate]) => ({
          version: Number(target),
          table,
          migrate,
        })),
      )
      .sort((left, right) => left.version - right.version);
    for (const step of steps) {
      if (!Number.isSafeInteger(step.version) || step.version < 2 || step.version > version) {
        throw invalid(
          `it has a migration for version ${step.version}; migrations go from version 2 to ${version}`,
        );
      }
      if (typeof step.migrate !== 'function') {
        throw invalid(`the migration of "${step.table}" to version ${step.version} is a function`);
      }
    }
    this.name = name;
    this.version = version;
    this.connection = new IndexedDbConnection({
      name,
      version,
      migrations: steps,
      idleTimeout,
      openTimeout,
      factory,
      declared: () => Array.from(this.tables.values(), ({ schema }) => schema),
    });
  }

  table<Row extends IndexedDbRow, Stored extends Row = Row>(
    schema: IndexedDbSchema<Row, Stored>,
  ): IndexedDbTable<Row, Stored> {
    const known = this.tables.get(schema.name);
    if (known === undefined) {
      const table = new IndexedDbTable<Row, Stored>(schema, this.connection);
      this.tables.set(schema.name, { schema, table });
      return table;
    }
    if (
      known.schema.constructor !== schema.constructor ||
      known.schema.signature !== schema.signature
    ) {
      throw new IndexedDbException(
        'schema_mismatch',
        `database "${this.name}" already has a table "${schema.name}" declared with another schema`,
      );
    }
    return known.table as IndexedDbTable<Row, Stored>;
  }

  close(): void {
    this.connection.close();
  }

  private static isDelay(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }
}
