import { IndexedDbException } from '../../exceptions/indexed-db.exception';
import { IndexedDbRequest } from '../transaction/indexed-db-request';
import { IndexedDbCursorToken } from './indexed-db-cursor-token';
import type { IndexedDbPosition } from './indexed-db-cursor-token';
import type { IndexedDbPage, IndexedDbQueryShape } from './indexed-db-query';

export type IndexedDbKeyOrder = (first: IDBValidKey, second: IDBValidKey) => number;

export class IndexedDbReader {
  private readonly context: string;

  constructor(
    private readonly table: string,
    private readonly keyOrder: IndexedDbKeyOrder,
  ) {
    this.context = `a read on table "${table}" failed`;
  }

  async get(store: IDBObjectStore, id: string): Promise<any> {
    const row = await IndexedDbRequest.result<unknown>(() => store.get(id), this.context);
    return row ?? null;
  }

  async getMany(store: IDBObjectStore, ids: readonly string[]): Promise<any[]> {
    const rows = await Promise.all(ids.map((id) => this.get(store, id)));
    return rows.filter((row) => row !== null);
  }

  async exists(store: IDBObjectStore, id: string): Promise<boolean> {
    return (await IndexedDbRequest.result(() => store.count(id), this.context)) > 0;
  }

  async count(store: IDBObjectStore, shape: IndexedDbQueryShape): Promise<number> {
    const { range, filter } = shape;
    const source = this.source(store, shape.index);
    if (filter === null) {
      return IndexedDbRequest.result(() => source.count(range ?? undefined), this.context);
    }
    let matched = 0;
    await IndexedDbRequest.walk<IDBCursorWithValue>(
      () => source.openCursor(range),
      this.context,
      (cursor) => {
        matched += filter(cursor.value) ? 1 : 0;
        cursor.continue();
        return true;
      },
    );
    return matched;
  }

  async page(
    store: IDBObjectStore,
    shape: IndexedDbQueryShape,
    counted: boolean,
  ): Promise<IndexedDbPage<any>> {
    const { index, range, direction, filter, compare, offset, limit, after } = shape;
    const source = this.source(store, index);
    if (compare !== null) {
      const all = await IndexedDbRequest.result<any[]>(() => source.getAll(range), this.context);
      const sorted = (filter === null ? all : all.filter(filter)).sort(compare);
      const end = limit === null ? undefined : offset + limit;
      return { items: sorted.slice(offset, end), total: sorted.length, next: null };
    }
    const scope = { index, direction };
    const start = after === null ? null : IndexedDbCursorToken.decode(after, scope);
    const sign = direction === 'next' ? 1 : -1;
    const whole = counted && filter !== null;
    const items: any[] = [];
    let jumping = start !== null && !whole;
    let matched = 0;
    let skipped = 0;
    let last: IndexedDbPosition | null = null;
    let more = false;
    await IndexedDbRequest.walk<IDBCursorWithValue>(
      () => source.openCursor(range, direction),
      this.context,
      (cursor) => {
        const order = start === null ? 1 : sign * this.order(cursor, start);
        if (jumping) {
          if (order < 0) {
            this.jump(cursor, start as IndexedDbPosition, index);
            return true;
          }
          jumping = false;
        }
        const row = cursor.value;
        if (filter === null || filter(row)) {
          matched += 1;
          if (order <= 0) {
            cursor.continue();
            return true;
          }
          if (skipped < offset) {
            skipped += 1;
          } else if (items.length !== limit) {
            items.push(row);
            last = { key: cursor.key, primaryKey: cursor.primaryKey };
          } else {
            more = true;
            if (!whole) {
              return false;
            }
          }
        }
        cursor.continue();
        return true;
      },
    );
    const next = more && last !== null ? IndexedDbCursorToken.encode(last, scope) : null;
    if (whole || !counted) {
      return { items, total: whole ? matched : 0, next };
    }
    const total = await IndexedDbRequest.result(
      () => source.count(range ?? undefined),
      this.context,
    );
    return { items, total, next };
  }

  private order(cursor: IDBCursor, position: IndexedDbPosition): number {
    return (
      this.keyOrder(cursor.key, position.key) ||
      this.keyOrder(cursor.primaryKey, position.primaryKey)
    );
  }

  private jump(cursor: IDBCursor, position: IndexedDbPosition, index: string | null): void {
    if (index === null) {
      cursor.continue(position.key);
    } else {
      cursor.continuePrimaryKey(position.key, position.primaryKey);
    }
  }

  private source(store: IDBObjectStore, index: string | null): IDBObjectStore | IDBIndex {
    if (index === null) {
      return store;
    }
    if (!store.indexNames.contains(index)) {
      throw new IndexedDbException(
        'invalid_query',
        `table "${this.table}" has no index "${index}"`,
      );
    }
    return store.index(index);
  }
}
