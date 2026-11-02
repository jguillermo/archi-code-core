import { IndexedDbException } from '../exceptions/indexed-db.exception';
import { IndexedDbCursorToken } from './indexed-db-cursor-token';
import type { IndexedDbPosition } from './indexed-db-cursor-token';

export type IndexedDbRange =
  | { readonly equals: IDBValidKey }
  | { readonly startsWith: string }
  | {
      readonly gt?: IDBValidKey;
      readonly gte?: IDBValidKey;
      readonly lt?: IDBValidKey;
      readonly lte?: IDBValidKey;
    };

export interface IndexedDbQuery<Row, Index extends string = string> {
  readonly index?: Index;
  readonly range?: IndexedDbRange;
  readonly direction?: IDBCursorDirection;
  readonly offset?: number;
  readonly limit?: number;
  readonly filter?: (row: Row) => boolean;
  readonly after?: string;
}

export interface IndexedDbPlan<Row> {
  readonly index: string | null;
  readonly range: IDBKeyRange | null;
  readonly direction: IDBCursorDirection;
  readonly offset: number;
  readonly limit: number;
  readonly filter: ((row: Row) => boolean) | null;
  readonly after: IndexedDbPosition | null;
}

export class IndexedDbQueryPlan {
  private static readonly DIRECTIONS: readonly IDBCursorDirection[] = [
    'next',
    'nextunique',
    'prev',
    'prevunique',
  ];

  static of<Row>(query: IndexedDbQuery<Row, string> = {}): IndexedDbPlan<Row> {
    const direction = query.direction ?? 'next';
    if (!IndexedDbQueryPlan.DIRECTIONS.includes(direction)) {
      throw new IndexedDbException(
        'invalid_query',
        `direction must be one of ${IndexedDbQueryPlan.DIRECTIONS.join(', ')}, received ${String(direction)}`,
      );
    }
    if (query.filter !== undefined && typeof query.filter !== 'function') {
      throw new IndexedDbException('invalid_query', 'filter must be a function of the row');
    }
    if (query.index !== undefined && (typeof query.index !== 'string' || query.index === '')) {
      throw new IndexedDbException('invalid_query', 'index must be the name of an index');
    }
    const index = query.index ?? null;
    if (query.after !== undefined && typeof query.after !== 'string') {
      throw new IndexedDbException('invalid_query', 'after must be the next token of a page');
    }
    return {
      index,
      range: IndexedDbQueryPlan.keyRange(query.range),
      direction,
      offset: IndexedDbQueryPlan.count('offset', query.offset, 0),
      limit: IndexedDbQueryPlan.count('limit', query.limit, Number.POSITIVE_INFINITY),
      filter: query.filter ?? null,
      after:
        query.after === undefined
          ? null
          : IndexedDbCursorToken.decode(query.after, { index, direction }),
    };
  }

  static keyRange(range: IndexedDbRange | undefined): IDBKeyRange | null {
    if (range === undefined) {
      return null;
    }
    try {
      if ('equals' in range) {
        return IDBKeyRange.only(range.equals);
      }
      if ('startsWith' in range) {
        if (typeof range.startsWith !== 'string') {
          throw new IndexedDbException('invalid_query', 'startsWith needs a text');
        }
        return IDBKeyRange.bound(range.startsWith, `${range.startsWith}\uffff`);
      }
      return IndexedDbQueryPlan.bounds(range);
    } catch (error) {
      if (error instanceof IndexedDbException) {
        throw error;
      }
      throw new IndexedDbException(
        'invalid_query',
        `the range is not a valid key range: ${(error as Error).message}`,
        {
          cause: error,
        },
      );
    }
  }

  static isUnique(direction: IDBCursorDirection): boolean {
    return direction === 'nextunique' || direction === 'prevunique';
  }

  static isForward(direction: IDBCursorDirection): boolean {
    return direction === 'next' || direction === 'nextunique';
  }

  private static bounds(range: {
    readonly gt?: IDBValidKey;
    readonly gte?: IDBValidKey;
    readonly lt?: IDBValidKey;
    readonly lte?: IDBValidKey;
  }): IDBKeyRange {
    if (range.gt !== undefined && range.gte !== undefined) {
      throw new IndexedDbException('invalid_query', 'use gt or gte, not both');
    }
    if (range.lt !== undefined && range.lte !== undefined) {
      throw new IndexedDbException('invalid_query', 'use lt or lte, not both');
    }
    const lower = range.gt ?? range.gte;
    const upper = range.lt ?? range.lte;
    if (lower === undefined && upper === undefined) {
      throw new IndexedDbException(
        'invalid_query',
        'a range needs equals, startsWith or at least one of gt, gte, lt, lte',
      );
    }
    if (lower === undefined) {
      return IDBKeyRange.upperBound(upper, range.lt !== undefined);
    }
    if (upper === undefined) {
      return IDBKeyRange.lowerBound(lower, range.gt !== undefined);
    }
    return IDBKeyRange.bound(lower, upper, range.gt !== undefined, range.lt !== undefined);
  }

  private static count(name: string, value: number | undefined, fallback: number): number {
    if (value === undefined) {
      return fallback;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new IndexedDbException(
        'invalid_query',
        `${name} must be a whole number of 0 or more, received ${String(value)}`,
      );
    }
    return value;
  }
}
