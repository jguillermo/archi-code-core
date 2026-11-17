import { IndexedDbException } from '../../exceptions/indexed-db.exception';

export interface IndexedDbQuery<Row> {
  readonly index?: string | null;
  readonly range?: IDBKeyRange | null;
  readonly direction?: 'next' | 'prev';
  readonly filter?: ((row: Row) => boolean) | null;
  readonly compare?: ((left: Row, right: Row) => number) | null;
  readonly offset?: number;
  readonly limit?: number | null;
  readonly after?: string | null;
}

export interface IndexedDbPage<Row> {
  readonly items: Row[];
  readonly total: number;
  readonly next: string | null;
}

export type IndexedDbQueryShape = Required<{
  readonly [Field in keyof IndexedDbQuery<any>]: NonNullable<IndexedDbQuery<any>[Field]> | null;
}> & { readonly direction: 'next' | 'prev'; readonly offset: number };

export class IndexedDbQueryCheck {
  static shape(query: IndexedDbQuery<any>, table: string): IndexedDbQueryShape {
    const {
      index = null,
      range = null,
      direction = 'next',
      filter = null,
      compare = null,
      offset = 0,
      limit = null,
      after = null,
    } = query;
    const invalid = (message: string): IndexedDbException =>
      new IndexedDbException('invalid_query', `table "${table}": ${message}`);
    if (direction !== 'next' && direction !== 'prev') {
      throw invalid(`direction is "next" or "prev", received "${String(direction)}"`);
    }
    if (!IndexedDbQueryCheck.isCount(offset)) {
      throw invalid(`offset is a non-negative integer, received ${String(offset)}`);
    }
    if (limit !== null && !IndexedDbQueryCheck.isCount(limit)) {
      throw invalid(`limit is a non-negative integer or null, received ${String(limit)}`);
    }
    if (compare !== null && after !== null) {
      throw invalid('a query sorted in memory with compare cannot continue from an after token');
    }
    return { index, range, direction, filter, compare, offset, limit, after };
  }

  static isCount(value: unknown): value is number {
    return Number.isSafeInteger(value) && (value as number) >= 0;
  }
}
