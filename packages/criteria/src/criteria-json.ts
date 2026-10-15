import { CriteriaNodes } from './criteria-input';
import { CriteriaError } from './criteria-error';
import { CriteriaScalar, isRecord } from './criteria-value';
import { FilterNode, TextOperator } from './filter-node';
import { OrderNode } from './order';
import { Pagination } from './pagination';

export type EncodedScalar = string | number | boolean | { readonly d: number };

export interface CriteriaJson {
  readonly v: 1;
  readonly f?: readonly unknown[];
  readonly o?: readonly (readonly [string, 1 | -1])[];
  readonly l?: number;
  readonly s?: number;
}

const TEXT_CODES: Record<TextOperator, string> = {
  contains: 'ct',
  startsWith: 'sw',
  endsWith: 'ew',
};

const TEXT_OPERATORS_BY_CODE: Record<string, TextOperator> = {
  ct: 'contains',
  sw: 'startsWith',
  ew: 'endsWith',
};

function encodeValue(value: CriteriaScalar): EncodedScalar {
  return value instanceof Date ? { d: value.getTime() } : value;
}

function encodeNode(node: FilterNode): unknown[] {
  switch (node.kind) {
    case 'compare':
      return [node.operator, node.field, encodeValue(node.value)];
    case 'between':
      return ['bt', node.field, encodeValue(node.min), encodeValue(node.max)];
    case 'in':
    case 'notIn':
      return [node.kind === 'in' ? 'in' : 'nin', node.field, node.values.map(encodeValue)];
    case 'text':
      return [TEXT_CODES[node.operator], node.field, node.value, node.caseSensitive ? 1 : 0];
    case 'isNull':
    case 'arrayEmpty':
      return [node.kind === 'isNull' ? 'nu' : 'em', node.field, node.value ? 1 : 0];
    case 'arrayContains':
      return [node.match === 'some' ? 'hs' : 'he', node.field, node.values.map(encodeValue)];
    case 'and':
    case 'or':
      return [node.kind, node.filters.map(encodeNode)];
    case 'not':
      return ['not', encodeNode(node.filter)];
  }
}

export function encodeCriteria(
  filter: FilterNode | null,
  order: readonly OrderNode[],
  pagination: Pagination | null,
): CriteriaJson {
  return {
    v: 1,
    ...(filter === null ? {} : { f: encodeNode(filter) }),
    ...(order.length === 0
      ? {}
      : { o: order.map((item) => [item.field, item.direction === 'asc' ? 1 : -1] as const) }),
    ...(pagination === null || pagination.limit === null ? {} : { l: pagination.limit }),
    ...(pagination === null || pagination.offset === 0 ? {} : { s: pagination.offset }),
  };
}

function decodeValue(value: unknown): unknown {
  if (isRecord(value) && Object.keys(value).length === 1 && typeof value.d === 'number') {
    return new Date(value.d);
  }
  return value;
}

function decodeList(values: unknown): unknown {
  return Array.isArray(values) ? values.map(decodeValue) : values;
}

function decodeFlag(flag: unknown): boolean {
  if (flag !== 0 && flag !== 1) {
    throw new CriteriaError('INVALID_FORMAT', 'A flag must be 0 or 1');
  }
  return flag === 1;
}

function decodeNode(raw: unknown): FilterNode {
  if (!Array.isArray(raw) || typeof raw[0] !== 'string') {
    throw new CriteriaError('INVALID_FORMAT', 'A filter must be a list that starts with its code');
  }
  const [code, first, second, third] = raw as [string, unknown, unknown, unknown];
  switch (code) {
    case 'eq':
    case 'ne':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return {
        kind: 'compare',
        field: first,
        operator: code,
        value: decodeValue(second),
      } as FilterNode;
    case 'bt':
      return {
        kind: 'between',
        field: first,
        min: decodeValue(second),
        max: decodeValue(third),
      } as FilterNode;
    case 'in':
    case 'nin':
      return {
        kind: code === 'in' ? 'in' : 'notIn',
        field: first,
        values: decodeList(second),
      } as FilterNode;
    case 'ct':
    case 'sw':
    case 'ew':
      return {
        kind: 'text',
        field: first,
        operator: TEXT_OPERATORS_BY_CODE[code],
        value: second,
        caseSensitive: decodeFlag(third),
      } as FilterNode;
    case 'nu':
    case 'em':
      return {
        kind: code === 'nu' ? 'isNull' : 'arrayEmpty',
        field: first,
        value: decodeFlag(second),
      } as FilterNode;
    case 'hs':
    case 'he':
      return {
        kind: 'arrayContains',
        field: first,
        match: code === 'hs' ? 'some' : 'every',
        values: decodeList(second),
      } as FilterNode;
    case 'and':
    case 'or':
      return {
        kind: code,
        filters: Array.isArray(first) ? first.map(decodeNode) : first,
      } as FilterNode;
    case 'not':
      return { kind: 'not', filter: decodeNode(first) };
    default:
      throw new CriteriaError('INVALID_FORMAT', `Unknown filter code "${code}"`);
  }
}

function decodeOrder(order: unknown): OrderNode[] {
  if (!Array.isArray(order)) {
    throw new CriteriaError('INVALID_FORMAT', 'The order must be a list');
  }
  return order.map((item: unknown) => {
    if (!Array.isArray(item) || item.length !== 2 || (item[1] !== 1 && item[1] !== -1)) {
      throw new CriteriaError('INVALID_FORMAT', 'Each order item must be [field, 1 | -1]');
    }
    return { field: item[0] as string, direction: item[1] === 1 ? 'asc' : 'desc' };
  });
}

export function decodeCriteria(json: unknown): CriteriaNodes {
  if (!isRecord(json)) {
    throw new CriteriaError('INVALID_FORMAT', 'The criteria JSON must be an object');
  }
  if (json.v !== 1) {
    throw new CriteriaError(
      'UNSUPPORTED_VERSION',
      `Unsupported criteria version "${String(json.v)}"`,
    );
  }
  return {
    filter: json.f === undefined ? null : decodeNode(json.f),
    order: json.o === undefined ? [] : decodeOrder(json.o),
    pagination:
      json.l === undefined && json.s === undefined
        ? null
        : {
            kind: 'offset',
            limit: (json.l ?? null) as number | null,
            offset: (json.s ?? 0) as number,
          },
  };
}
