import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbConnections } from './indexed-db-connections';
import type { IndexedDbPosition } from './indexed-db-cursor-token';
import { IndexedDbQueryPlan } from './indexed-db-query';
import type { IndexedDbPlan, IndexedDbQuery } from './indexed-db-query';
import { IndexedDbSchema } from './indexed-db-schema';
import type { IndexedDbSchemaOptions, IndexedDbTableDefinition } from './indexed-db-schema';
import { IndexedDbStoreOperations } from './indexed-db-store-operations';
import type { IndexedDbPage, IndexedDbRow } from './indexed-db-store-operations';
import { IndexedDbTransaction } from './indexed-db-transaction';
import type { IndexedDbDurability } from './indexed-db-transaction';

export interface IndexedDbTableOptions<
  Index extends string = string,
> extends IndexedDbSchemaOptions<Index> {
  readonly database: string;
  readonly durability?: IndexedDbDurability;
  readonly factory?: IDBFactory;
}

export interface IndexedDbTableLookup {
  readonly factory?: IDBFactory;
}

export interface IndexedDbDatabaseOptions {
  readonly factory?: IDBFactory;
}

export interface IndexedDbIterateOptions {
  readonly batchSize?: number;
}

type AnyTable = IndexedDbTable<any, any>;

export interface IndexedDbTransactionScope {
  insert<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    row: R,
  ): Promise<string>;
  insertMany<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    rows: readonly R[],
  ): Promise<string[]>;
  put<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    row: R,
  ): Promise<string>;
  putMany<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    rows: readonly R[],
  ): Promise<string[]>;
  update<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    row: R,
  ): Promise<void>;
  patch<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    id: string,
    changes: Partial<R>,
  ): Promise<R>;
  get<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    id: string,
  ): Promise<R | null>;
  getMany<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    ids: readonly string[],
  ): Promise<(R | null)[]>;
  exists<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    id: string,
  ): Promise<boolean>;
  delete<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    id: string,
  ): Promise<void>;
  deleteMany<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    ids: readonly string[],
  ): Promise<void>;
  deleteWhere<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    query?: IndexedDbQuery<R, I>,
  ): Promise<number>;
  clear<R extends IndexedDbRow, I extends string>(table: IndexedDbTable<R, I>): Promise<void>;
  count<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    query?: IndexedDbQuery<R, I>,
  ): Promise<number>;
  find<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    query?: IndexedDbQuery<R, I>,
  ): Promise<IndexedDbPage<R>>;
  findOne<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    query?: IndexedDbQuery<R, I>,
  ): Promise<R | null>;
  ids<R extends IndexedDbRow, I extends string>(
    table: IndexedDbTable<R, I>,
    query?: IndexedDbQuery<R, I>,
  ): Promise<string[]>;
}

export class IndexedDbTable<Row extends IndexedDbRow, Index extends string = string> {
  private static readonly DURABILITIES: readonly IndexedDbDurability[] = [
    'relaxed',
    'default',
    'strict',
  ];
  private static readonly registries = new WeakMap<IDBFactory, Map<string, AnyTable>>();

  readonly name: string;
  readonly database: string;
  readonly definition: IndexedDbTableDefinition;
  private readonly factory: IDBFactory;
  private readonly durability: IndexedDbDurability;

  private constructor(
    factory: IDBFactory,
    database: string,
    definition: IndexedDbTableDefinition,
    durability: IndexedDbDurability,
  ) {
    this.factory = factory;
    this.database = database;
    this.definition = definition;
    this.name = definition.name;
    this.durability = durability;
  }

  static of<R extends IndexedDbRow, I extends string = string>(
    name: string,
    options: IndexedDbTableOptions<I> | IndexedDbTableLookup = {},
  ): IndexedDbTable<R, I> {
    const factory = IndexedDbConnections.factory(options.factory);
    const tables = IndexedDbTable.tablesOf(factory);
    const existing = tables.get(name);
    if (!('database' in options)) {
      if (existing === undefined) {
        throw new IndexedDbException(
          'schema_mismatch',
          `table "${name}" is not declared: declare it once with IndexedDbTable.of("${name}", { database, ... }) before using it by name`,
        );
      }
      return existing as IndexedDbTable<R, I>;
    }
    const durability = options.durability ?? 'default';
    if (!IndexedDbTable.DURABILITIES.includes(durability)) {
      throw new IndexedDbException(
        'schema_mismatch',
        `durability must be one of ${IndexedDbTable.DURABILITIES.join(', ')}, received ${String(durability)}`,
      );
    }
    if (typeof options.database !== 'string' || options.database === '') {
      throw new IndexedDbException('schema_mismatch', 'a database needs a non-empty name');
    }
    const definition = IndexedDbSchema.definitionOf(name, options);
    if (existing !== undefined) {
      if (existing.database !== options.database) {
        throw new IndexedDbException(
          'schema_mismatch',
          `table "${name}" already belongs to database "${existing.database}": a table name is used once`,
        );
      }
      if (
        !IndexedDbSchema.sameTable(existing.definition, definition) ||
        existing.durability !== durability
      ) {
        throw new IndexedDbException(
          'schema_mismatch',
          `table "${name}" is declared twice with different options: declare it in one place and use IndexedDbTable.of("${name}") everywhere else`,
        );
      }
      return existing as IndexedDbTable<R, I>;
    }
    IndexedDbConnections.register(factory, options.database, definition);
    const table = new IndexedDbTable<R, I>(factory, options.database, definition, durability);
    tables.set(name, table);
    return table;
  }

  static close(database: string, { factory }: IndexedDbDatabaseOptions = {}): void {
    IndexedDbConnections.close(IndexedDbConnections.factory(factory), database);
  }

  static deleteDatabase(
    database: string,
    { factory }: IndexedDbDatabaseOptions = {},
  ): Promise<void> {
    return IndexedDbConnections.deleteDatabase(IndexedDbConnections.factory(factory), database);
  }

  static drop(
    database: string,
    table: string,
    { factory }: IndexedDbDatabaseOptions = {},
  ): Promise<boolean> {
    return IndexedDbConnections.drop(IndexedDbConnections.factory(factory), database, table);
  }

  static transaction<T>(
    tables: readonly AnyTable[],
    mode: IDBTransactionMode,
    work: (scope: IndexedDbTransactionScope) => Promise<T> | T,
  ): Promise<T> {
    const [first] = tables;
    if (first === undefined) {
      return Promise.reject(
        new IndexedDbException('invalid_query', 'a transaction needs at least one table'),
      );
    }
    if (
      tables.some((table) => table.factory !== first.factory || table.database !== first.database)
    ) {
      return Promise.reject(
        new IndexedDbException(
          'invalid_query',
          `every table of a transaction must belong to database "${first.database}"`,
        ),
      );
    }
    const names = Array.from(new Set(tables.map((table) => table.name)));
    const durability = tables
      .map((table) => table.durability)
      .reduce((strongest, candidate) =>
        IndexedDbTable.DURABILITIES.indexOf(candidate) >
        IndexedDbTable.DURABILITIES.indexOf(strongest)
          ? candidate
          : strongest,
      );
    return IndexedDbConnections.run(
      first.factory,
      first.database,
      names,
      mode,
      durability,
      (transaction) => {
        const of = <R extends IndexedDbRow, I extends string>(
          table: IndexedDbTable<R, I>,
        ): IndexedDbStoreOperations<R> => {
          if (!tables.includes(table)) {
            throw new IndexedDbException(
              'invalid_query',
              `table "${table.name}" is not part of this transaction`,
            );
          }
          return table.operations(transaction);
        };
        const scope: IndexedDbTransactionScope = {
          insert: async (table, row) => of(table).insert(row),
          insertMany: async (table, rows) => of(table).insertMany(rows),
          put: async (table, row) => of(table).put(row),
          putMany: async (table, rows) => of(table).putMany(rows),
          update: async (table, row) => of(table).update(row),
          patch: async (table, id, changes) => of(table).patch(id, changes),
          get: async (table, id) => of(table).get(id),
          getMany: async (table, ids) => of(table).getMany(ids),
          exists: async (table, id) => of(table).exists(id),
          delete: async (table, id) => of(table).delete(id),
          deleteMany: async (table, ids) => of(table).deleteMany(ids),
          deleteWhere: async (table, query) => of(table).deleteWhere(IndexedDbQueryPlan.of(query)),
          clear: async (table) => of(table).clear(),
          count: async (table, query) => of(table).count(IndexedDbTable.countPlan(query)),
          find: async (table, query) => of(table).find(IndexedDbQueryPlan.of(query)),
          findOne: async (table, query) => of(table).findOne(IndexedDbQueryPlan.of(query)),
          ids: async (table, query) => of(table).ids(IndexedDbQueryPlan.of(query)),
        };
        return work(scope);
      },
    );
  }

  insert(row: Row): Promise<string> {
    return this.execute('readwrite', (operations) => operations.insert(row));
  }

  insertMany(rows: readonly Row[]): Promise<string[]> {
    return this.execute('readwrite', (operations) => operations.insertMany(rows));
  }

  put(row: Row): Promise<string> {
    return this.execute('readwrite', (operations) => operations.put(row));
  }

  putMany(rows: readonly Row[]): Promise<string[]> {
    return this.execute('readwrite', (operations) => operations.putMany(rows));
  }

  update(row: Row): Promise<void> {
    return this.execute('readwrite', (operations) => operations.update(row));
  }

  patch(id: string, changes: Partial<Row>): Promise<Row> {
    return this.execute('readwrite', (operations) => operations.patch(id, changes));
  }

  get(id: string): Promise<Row | null> {
    return this.execute('readonly', (operations) => operations.get(id));
  }

  getMany(ids: readonly string[]): Promise<(Row | null)[]> {
    return this.execute('readonly', (operations) => operations.getMany(ids));
  }

  exists(id: string): Promise<boolean> {
    return this.execute('readonly', (operations) => operations.exists(id));
  }

  delete(id: string): Promise<void> {
    return this.execute('readwrite', (operations) => operations.delete(id));
  }

  deleteMany(ids: readonly string[]): Promise<void> {
    return this.execute('readwrite', (operations) => operations.deleteMany(ids));
  }

  async deleteWhere(query: IndexedDbQuery<Row, Index> = {}): Promise<number> {
    const plan = IndexedDbQueryPlan.of(query);
    return this.execute('readwrite', (operations) => operations.deleteWhere(plan));
  }

  clear(): Promise<void> {
    return this.execute('readwrite', (operations) => operations.clear());
  }

  async count(query: IndexedDbQuery<Row, Index> = {}): Promise<number> {
    const plan = IndexedDbTable.countPlan(query);
    return this.execute('readonly', (operations) => operations.count(plan));
  }

  async find(query: IndexedDbQuery<Row, Index> = {}): Promise<IndexedDbPage<Row>> {
    const plan = IndexedDbQueryPlan.of(query);
    return this.execute('readonly', (operations) => operations.find(plan));
  }

  async findOne(query: IndexedDbQuery<Row, Index> = {}): Promise<Row | null> {
    const plan = IndexedDbQueryPlan.of(query);
    return this.execute('readonly', (operations) => operations.findOne(plan));
  }

  async ids(query: IndexedDbQuery<Row, Index> = {}): Promise<string[]> {
    const plan = IndexedDbQueryPlan.of(query);
    return this.execute('readonly', (operations) => operations.ids(plan));
  }

  async *iterate(
    query: IndexedDbQuery<Row, Index> = {},
    { batchSize = 100 }: IndexedDbIterateOptions = {},
  ): AsyncGenerator<Row, void, undefined> {
    const plan = IndexedDbQueryPlan.of(query);
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
      throw new IndexedDbException(
        'invalid_query',
        `batchSize must be a whole number of 1 or more, received ${String(batchSize)}`,
      );
    }
    let after: IndexedDbPosition | null = plan.after;
    let offset = plan.offset;
    let remaining = plan.limit;
    while (remaining > 0) {
      const batch = { ...plan, after, offset, limit: Math.min(batchSize, remaining) };
      const slice = await this.execute('readonly', (operations) => operations.rows(batch, true));
      for (const row of slice.items) {
        yield row;
      }
      if (!slice.more) {
        return;
      }
      remaining -= slice.items.length;
      after = slice.last;
      offset = 0;
    }
  }

  withStore<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore, transaction: IDBTransaction) => IDBRequest<T> | undefined,
  ): Promise<T | undefined> {
    return IndexedDbConnections.run(
      this.factory,
      this.database,
      [this.name],
      mode,
      this.durability,
      (transaction) => {
        const request = work(transaction.objectStore(this.name), transaction);
        return request === undefined
          ? undefined
          : IndexedDbTransaction.request(request, `a request on table "${this.name}" failed`);
      },
    );
  }

  private static countPlan<R>(query: IndexedDbQuery<R, string> = {}): IndexedDbPlan<R> {
    return IndexedDbQueryPlan.of({
      ...query,
      offset: undefined,
      limit: undefined,
      after: undefined,
    });
  }

  private operations(transaction: IDBTransaction): IndexedDbStoreOperations<Row> {
    return new IndexedDbStoreOperations<Row>(transaction.objectStore(this.name), (left, right) =>
      this.factory.cmp(left, right),
    );
  }

  private execute<T>(
    mode: IDBTransactionMode,
    work: (operations: IndexedDbStoreOperations<Row>) => Promise<T>,
  ): Promise<T> {
    return IndexedDbConnections.run(
      this.factory,
      this.database,
      [this.name],
      mode,
      this.durability,
      (transaction) => work(this.operations(transaction)),
    );
  }

  private static tablesOf(factory: IDBFactory): Map<string, AnyTable> {
    let tables = IndexedDbTable.registries.get(factory);
    if (tables === undefined) {
      tables = new Map();
      IndexedDbTable.registries.set(factory, tables);
    }
    return tables;
  }
}
