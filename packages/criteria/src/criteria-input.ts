import { CriteriaError } from './criteria-error';
import { isRecord } from './criteria-value';
import { FilterNode } from './filter-node';
import { normalizeOrderBy } from './normalize-order';
import { normalizeWhere } from './normalize-where';
import { OrderBy, OrderNode } from './order';
import { Pagination } from './pagination';
import { Where } from './where';

export interface CriteriaInput<T> {
  readonly where?: Where<T>;
  readonly orderBy?: OrderBy<T>;
  readonly limit?: number;
  readonly offset?: number;
}

export interface CriteriaNodes {
  readonly filter?: FilterNode | null;
  readonly order?: readonly OrderNode[];
  readonly pagination?: Pagination | null;
}

const INPUT_KEYS = new Set(['where', 'orderBy', 'limit', 'offset']);

export function paginationOf(limit: unknown, offset: unknown): Pagination | null {
  if (limit === undefined && offset === undefined) {
    return null;
  }
  return {
    kind: 'offset',
    limit: (limit ?? null) as number | null,
    offset: (offset ?? 0) as number,
  };
}

export function inputToNodes(input: unknown): Required<CriteriaNodes> {
  if (!isRecord(input)) {
    throw new CriteriaError('INVALID_FORMAT', 'The criteria input must be an object');
  }
  const unknownKey = Object.keys(input).find((key) => !INPUT_KEYS.has(key));
  if (unknownKey !== undefined) {
    throw new CriteriaError('INVALID_FORMAT', `Unknown criteria key "${unknownKey}"`);
  }
  return {
    filter: input.where === undefined ? null : normalizeWhere(input.where),
    order: input.orderBy === undefined ? [] : normalizeOrderBy(input.orderBy),
    pagination: paginationOf(input.limit, input.offset),
  };
}
