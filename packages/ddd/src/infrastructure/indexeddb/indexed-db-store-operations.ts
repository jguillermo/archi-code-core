import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbCursorToken } from './indexed-db-cursor-token';
import type { IndexedDbPosition } from './indexed-db-cursor-token';
import { IndexedDbQueryPlan } from './indexed-db-query';
import type { IndexedDbPlan } from './indexed-db-query';
import { IndexedDbTransaction } from './indexed-db-transaction';

export interface IndexedDbPage<Row> {
  readonly items: Row[];
  readonly total: number;
  readonly next: string | null;
}

export interface IndexedDbSlice<Item> {
  readonly items: Item[];
  readonly last: IndexedDbPosition | null;
  readonly more: boolean;
}

type Source = IDBObjectStore | IDBIndex;

export interface IndexedDbRow {
  readonly id: string;
}

export class IndexedDbStoreOperations<Row extends IndexedDbRow> {
  private readonly context: string;

  constructor(
    private readonly store: IDBObjectStore,
    private readonly cmp: (left: unknown, right: unknown) => number,
  ) {
    this.context = `a request on table "${store.name}" failed`;
  }

  insert(row: Row): Promise<string> {
    return this.request(() => this.store.add(row)) as Promise<string>;
  }

  insertMany(rows: readonly Row[]): Promise<string[]> {
    return Promise.all(rows.map((row) => this.insert(row)));
  }

  put(row: Row): Promise<string> {
    return this.request(() => this.store.put(row)) as Promise<string>;
  }

  putMany(rows: readonly Row[]): Promise<string[]> {
    return Promise.all(rows.map((row) => this.put(row)));
  }

  async update(row: Row): Promise<void> {
    if (!(await this.exists(row.id))) {
      throw this.notFound(row.id);
    }
    await this.put(row);
  }

  async patch(id: string, changes: Partial<Row>): Promise<Row> {
    const current = await this.get(id);
    if (current === null) {
      throw this.notFound(id);
    }
    if ('id' in changes && changes.id !== id) {
      throw new IndexedDbException(
        'invalid_key',
        `a patch cannot change the id of a row of table "${this.store.name}"`,
      );
    }
    const patched = { ...current, ...changes };
    await this.put(patched);
    return patched;
  }

  async get(id: string): Promise<Row | null> {
    return ((await this.request(() => this.store.get(id))) as Row | undefined) ?? null;
  }

  getMany(ids: readonly string[]): Promise<(Row | null)[]> {
    return Promise.all(ids.map((id) => this.get(id)));
  }

  async exists(id: string): Promise<boolean> {
    return (await this.request(() => this.store.getKey(id))) !== undefined;
  }

  delete(id: string): Promise<void> {
    return this.request(() => this.store.delete(id));
  }

  async deleteMany(ids: readonly string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }

  async deleteWhere(plan: IndexedDbPlan<Row>): Promise<number> {
    const slice = await this.scan(plan, plan.limit, false, (cursor) => {
      (cursor as IDBCursorWithValue).delete();
      return true;
    });
    return slice.items.length;
  }

  clear(): Promise<void> {
    return this.request(() => this.store.clear());
  }

  count(plan: IndexedDbPlan<Row>): Promise<number> {
    const source = this.source(plan);
    if (plan.filter === null && !IndexedDbQueryPlan.isUnique(plan.direction)) {
      return this.request(() => source.count(plan.range ?? undefined));
    }
    let total = 0;
    const filter = plan.filter;
    const request = (
      filter === null
        ? source.openKeyCursor(plan.range, plan.direction)
        : source.openCursor(plan.range, plan.direction)
    ) as IDBRequest<IDBCursor | null>;
    return IndexedDbTransaction.walk<IDBCursor>(request, this.context, (cursor) => {
      if (filter === null || filter((cursor as IDBCursorWithValue).value as Row)) {
        total += 1;
      }
      cursor.continue();
      return true;
    }).then(() => total);
  }

  async find(plan: IndexedDbPlan<Row>): Promise<IndexedDbPage<Row>> {
    const [slice, total] = await Promise.all([this.rows(plan, true), this.count(plan)]);
    return { items: slice.items, total, next: this.tokenOf(plan, slice) };
  }

  async findOne(plan: IndexedDbPlan<Row>): Promise<Row | null> {
    const slice = await this.rows({ ...plan, limit: 1 }, false);
    return slice.items[0] ?? null;
  }

  async ids(plan: IndexedDbPlan<Row>): Promise<string[]> {
    const source = this.source(plan);
    if (this.readsInOrder(plan)) {
      return (await this.request(() =>
        source.getAllKeys(plan.range, IndexedDbStoreOperations.countOf(plan.limit)),
      )) as string[];
    }
    const slice = await this.scan(plan, plan.limit, false, (cursor) => cursor.primaryKey as string);
    return slice.items;
  }

  rows(plan: IndexedDbPlan<Row>, lookAhead: boolean): Promise<IndexedDbSlice<Row>> {
    const unbounded = plan.limit === Number.POSITIVE_INFINITY;
    if (this.readsInOrder(plan) && (unbounded || !lookAhead || plan.index === null)) {
      const source = this.source(plan);
      const wanted = lookAhead && !unbounded ? plan.limit + 1 : plan.limit;
      return this.request(() =>
        source.getAll(plan.range, IndexedDbStoreOperations.countOf(wanted)),
      ).then((found) => {
        const items = (found as Row[]).slice(0, plan.limit);
        const more = found.length > items.length;
        const id = more ? items[items.length - 1].id : null;
        return { items, last: id === null ? null : { key: id, primaryKey: id }, more };
      });
    }
    return this.scan(
      plan,
      plan.limit,
      lookAhead,
      (cursor) => (cursor as IDBCursorWithValue).value as Row,
    );
  }

  private readsInOrder(plan: IndexedDbPlan<Row>): boolean {
    return (
      plan.after === null &&
      plan.offset === 0 &&
      plan.direction === 'next' &&
      plan.filter === null &&
      plan.limit > 0
    );
  }

  private static countOf(limit: number): number | undefined {
    return limit === Number.POSITIVE_INFINITY ? undefined : limit;
  }

  private tokenOf(plan: IndexedDbPlan<Row>, slice: IndexedDbSlice<unknown>): string | null {
    return slice.more && slice.last !== null ? IndexedDbCursorToken.encode(slice.last, plan) : null;
  }

  private async scan<Item>(
    plan: IndexedDbPlan<Row>,
    limit: number,
    lookAhead: boolean,
    take: (cursor: IDBCursor) => Item,
  ): Promise<IndexedDbSlice<Item>> {
    const items: Item[] = [];
    const after = plan.after;
    const range = after === null ? plan.range : this.resumeRange(plan, after);
    if (range === undefined || limit === 0) {
      return { items, last: null, more: false };
    }
    const source = this.source(plan);
    const filter = plan.filter;
    let phase: 'reposition' | 'skip' | 'take' =
      after !== null ? 'reposition' : plan.offset > 0 ? 'skip' : 'take';
    let skipped = 0;
    let last: IndexedDbPosition | null = null;
    let more = false;
    await IndexedDbTransaction.walk<IDBCursor>(
      source.openCursor(range, plan.direction) as IDBRequest<IDBCursor | null>,
      this.context,
      (cursor) => {
        if (phase === 'reposition') {
          const order = this.orderAgainst(plan, cursor, after as IndexedDbPosition);
          if (order < 0) {
            cursor.continuePrimaryKey(
              (after as IndexedDbPosition).key,
              (after as IndexedDbPosition).primaryKey,
            );
            return true;
          }
          if (order === 0) {
            cursor.continue();
            return true;
          }
          phase = plan.offset > 0 ? 'skip' : 'take';
        }
        if (phase === 'skip' && filter === null) {
          phase = 'take';
          cursor.advance(plan.offset);
          return true;
        }
        if (filter !== null && !filter((cursor as IDBCursorWithValue).value as Row)) {
          cursor.continue();
          return true;
        }
        if (phase === 'skip') {
          skipped += 1;
          if (skipped === plan.offset) {
            phase = 'take';
          }
          cursor.continue();
          return true;
        }
        if (items.length === limit) {
          more = true;
          return false;
        }
        items.push(take(cursor));
        last = { key: cursor.key, primaryKey: cursor.primaryKey };
        if (items.length === limit && !lookAhead) {
          return false;
        }
        cursor.continue();
        return true;
      },
    );
    return { items, last, more };
  }

  private resumeRange(
    plan: IndexedDbPlan<Row>,
    from: IndexedDbPosition,
  ): IDBKeyRange | null | undefined {
    const forward = IndexedDbQueryPlan.isForward(plan.direction);
    const open = plan.index === null || IndexedDbQueryPlan.isUnique(plan.direction);
    const range = plan.range;
    try {
      if (forward) {
        return range === null || range.upper === undefined
          ? IDBKeyRange.lowerBound(from.key, open)
          : IDBKeyRange.bound(from.key, range.upper, open, range.upperOpen);
      }
      return range === null || range.lower === undefined
        ? IDBKeyRange.upperBound(from.key, open)
        : IDBKeyRange.bound(range.lower, from.key, range.lowerOpen, open);
    } catch {
      return undefined;
    }
  }

  private orderAgainst(
    plan: IndexedDbPlan<Row>,
    cursor: IDBCursor,
    from: IndexedDbPosition,
  ): number {
    const sign = IndexedDbQueryPlan.isForward(plan.direction) ? 1 : -1;
    let order = this.cmp(cursor.key, from.key);
    if (order === 0 && plan.index !== null && !IndexedDbQueryPlan.isUnique(plan.direction)) {
      order = this.cmp(cursor.primaryKey, from.primaryKey);
    }
    return order * sign;
  }

  private source(plan: IndexedDbPlan<Row>): Source {
    if (plan.index === null) {
      return this.store;
    }
    if (!this.store.indexNames.contains(plan.index)) {
      throw new IndexedDbException(
        'unknown_index',
        `table "${this.store.name}" has no index "${plan.index}"; it has ${
          Array.from(this.store.indexNames).join(', ') || 'none'
        }`,
      );
    }
    return this.store.index(plan.index);
  }

  private request<R>(create: () => IDBRequest<R>): Promise<R> {
    let request: IDBRequest<R>;
    try {
      request = create();
    } catch (error) {
      return Promise.reject(IndexedDbTransaction.failure(error, this.context));
    }
    return IndexedDbTransaction.request(request, this.context);
  }

  private notFound(id: string): IndexedDbException {
    return new IndexedDbException(
      'not_found',
      `table "${this.store.name}" has no row with the id ${JSON.stringify(id)}`,
    );
  }
}
