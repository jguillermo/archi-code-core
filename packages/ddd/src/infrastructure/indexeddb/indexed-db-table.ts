import { IndexedDbException } from '../exceptions/indexed-db.exception';
import type { IndexedDbConnection } from './connection/indexed-db-connection';
import type {
  IndexedDbInput,
  IndexedDbRow,
  IndexedDbSchema,
  IndexedDbStored,
} from './indexed-db-schema';
import { IndexedDbQueryCheck } from './query/indexed-db-query';
import type { IndexedDbPage, IndexedDbQuery } from './query/indexed-db-query';
import { IndexedDbReader } from './query/indexed-db-reader';
import { IndexedDbWriter } from './write/indexed-db-writer';

export interface IndexedDbTableIndex {
  readonly name: string | null;
  readonly keyPath: string;
}

export interface IndexedDbIterateOptions {
  readonly batchSize?: number;
}

export class IndexedDbTable<Row extends IndexedDbRow, Stored extends Row = Row> {
  readonly name: string;
  readonly indexes: readonly IndexedDbTableIndex[];
  private readonly reader: IndexedDbReader;
  private readonly writer: IndexedDbWriter;

  constructor(
    schema: IndexedDbSchema<Row, Stored>,
    private readonly connection: IndexedDbConnection,
  ) {
    this.name = schema.name;
    this.indexes = [
      { name: null, keyPath: 'id' },
      ...Array.from(schema.indexes).flatMap(([name, { keyPath, multiEntry }]) =>
        typeof keyPath === 'string' && !multiEntry ? [{ name, keyPath }] : [],
      ),
    ];
    this.reader = new IndexedDbReader(schema.name, (first, second) =>
      connection.compare(first, second),
    );
    this.writer = new IndexedDbWriter(schema);
  }

  get(id: string): Promise<IndexedDbStored<Stored> | null> {
    return this.connection.run(this.name, 'readonly', (store) => this.reader.get(store, id));
  }

  getMany(ids: readonly string[]): Promise<IndexedDbStored<Stored>[]> {
    return this.connection.run(this.name, 'readonly', (store) => this.reader.getMany(store, ids));
  }

  exists(id: string): Promise<boolean> {
    return this.connection.run(this.name, 'readonly', (store) => this.reader.exists(store, id));
  }

  async count(query: IndexedDbQuery<IndexedDbStored<Stored>> = {}): Promise<number> {
    const shape = IndexedDbQueryCheck.shape(query, this.name);
    return this.connection.run(this.name, 'readonly', (store) => this.reader.count(store, shape));
  }

  async find(
    query: IndexedDbQuery<IndexedDbStored<Stored>> = {},
  ): Promise<IndexedDbPage<IndexedDbStored<Stored>>> {
    const shape = IndexedDbQueryCheck.shape(query, this.name);
    return this.connection.run(this.name, 'readonly', (store) =>
      this.reader.page(store, shape, true),
    );
  }

  async *iterate(
    query: Omit<IndexedDbQuery<IndexedDbStored<Stored>>, 'compare' | 'limit'> = {},
    { batchSize = 100 }: IndexedDbIterateOptions = {},
  ): AsyncGenerator<IndexedDbStored<Stored>[], void, void> {
    const shape = IndexedDbQueryCheck.shape(query, this.name);
    if (shape.compare !== null || !IndexedDbQueryCheck.isCount(batchSize) || batchSize === 0) {
      throw new IndexedDbException(
        'invalid_query',
        `table "${this.name}": iterate reads batches of a positive integer size in the order of the index, without compare`,
      );
    }
    let { offset, after } = shape;
    do {
      const batch = { ...shape, offset, after, limit: batchSize };
      const page = await this.connection.run(this.name, 'readonly', (store) =>
        this.reader.page(store, batch, false),
      );
      if (page.items.length > 0) {
        yield page.items;
      }
      offset = 0;
      after = page.next;
    } while (after !== null);
  }

  persist(row: IndexedDbInput<Row>): Promise<void> {
    return this.connection.run(this.name, 'readwrite', (store) =>
      this.writer.persist(store, row, true),
    );
  }

  persistMany(rows: readonly IndexedDbInput<Row>[]): Promise<void> {
    return this.connection.run(this.name, 'readwrite', async (store) => {
      for (const row of rows) {
        await this.writer.persist(store, row, false);
      }
    });
  }

  remove(id: string, rowVersion?: number | null): Promise<void> {
    return this.connection.run(this.name, 'readwrite', (store) =>
      this.writer.remove(store, id, rowVersion),
    );
  }

  removeMany(ids: readonly string[]): Promise<void> {
    return this.connection.run(this.name, 'readwrite', async (store) => {
      await Promise.all(ids.map((id) => this.writer.remove(store, id)));
    });
  }

  clear(): Promise<void> {
    return this.connection.run(this.name, 'readwrite', (store) => this.writer.clear(store));
  }
}
