import { CriteriaError, quote } from './criteria-error';
import {
  compareValues,
  copyScalar,
  CriteriaScalar,
  isRangeValue,
  isRecord,
  isScalar,
  RangeValue,
  sameKind,
} from './criteria-value';
import { assertDepth } from './criteria-limits';
import { assertField } from './field-name';
import {
  ArrayMatch,
  COMPARISON_OPERATORS,
  ComparisonOperator,
  FilterNode,
  TEXT_OPERATORS,
  TextOperator,
} from './filter-node';
import { OrderNode, SortDirection } from './order';
import { Pagination } from './pagination';

function freezeScalar(value: unknown, field: string): CriteriaScalar {
  if (!isScalar(value)) {
    throw new CriteriaError('INVALID_VALUE', `Invalid value for field "${quote(field)}"`);
  }
  return copyScalar(value);
}

function freezeRangeValue(value: unknown, field: string): RangeValue {
  if (!isRangeValue(value)) {
    throw new CriteriaError(
      'INVALID_VALUE',
      `Field "${quote(field)}" needs a string, a finite number or a valid Date`,
    );
  }
  return copyScalar(value);
}

function freezeList(values: unknown, field: string): readonly CriteriaScalar[] {
  if (!Array.isArray(values)) {
    throw new CriteriaError('INVALID_VALUE', `Field "${quote(field)}" needs a list of values`);
  }
  if (values.length === 0) {
    throw new CriteriaError('EMPTY_LIST', `Field "${quote(field)}" needs at least one value`);
  }
  const frozen = values.map((value) => freezeScalar(value, field));
  if (!frozen.every((value) => sameKind(value, frozen[0]))) {
    throw new CriteriaError('INVALID_VALUE', `The values of "${quote(field)}" mix value types`);
  }
  return Object.freeze(frozen);
}

function freezeBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new CriteriaError('INVALID_VALUE', `Field "${quote(field)}" needs true or false`);
  }
  return value;
}

function freezeChildren(filters: unknown, kind: string, depth: number): readonly FilterNode[] {
  if (!Array.isArray(filters)) {
    throw new CriteriaError('INVALID_FORMAT', `"${quote(kind)}" needs a list of filters`);
  }
  if (filters.length === 0) {
    throw new CriteriaError('EMPTY_LIST', `"${quote(kind)}" needs at least one filter`);
  }
  return Object.freeze(filters.map((filter) => freezeFilter(filter, depth + 1)));
}

function freezeComparison(node: Record<string, unknown>): FilterNode {
  const field = assertField(node.field);
  const operator = node.operator as ComparisonOperator;
  if (!COMPARISON_OPERATORS.includes(operator)) {
    throw new CriteriaError('INVALID_OPERATOR', `Unknown comparison "${quote(node.operator)}"`);
  }
  const value =
    operator === 'eq' || operator === 'ne'
      ? freezeScalar(node.value, field)
      : freezeRangeValue(node.value, field);
  return Object.freeze({ kind: 'compare', field, operator, value });
}

function freezeBetween(node: Record<string, unknown>): FilterNode {
  const field = assertField(node.field);
  const min = freezeRangeValue(node.min, field);
  const max = freezeRangeValue(node.max, field);
  if (!sameKind(min, max)) {
    throw new CriteriaError('INVALID_RANGE', `The range of "${quote(field)}" mixes value types`);
  }
  if (compareValues(min, max) > 0) {
    throw new CriteriaError('INVALID_RANGE', `The range of "${quote(field)}" starts after it ends`);
  }
  return Object.freeze({ kind: 'between', field, min, max });
}

function freezeText(node: Record<string, unknown>): FilterNode {
  const field = assertField(node.field);
  const operator = node.operator as TextOperator;
  if (!TEXT_OPERATORS.includes(operator)) {
    throw new CriteriaError('INVALID_OPERATOR', `Unknown text operator "${quote(node.operator)}"`);
  }
  if (typeof node.value !== 'string' || node.value.length === 0) {
    throw new CriteriaError(
      'INVALID_VALUE',
      `Field "${quote(field)}" needs a non-empty text value`,
    );
  }
  const caseSensitive = freezeBoolean(node.caseSensitive, field);
  return Object.freeze({ kind: 'text', field, operator, value: node.value, caseSensitive });
}

function freezeArrayContains(node: Record<string, unknown>): FilterNode {
  const field = assertField(node.field);
  const match = node.match as ArrayMatch;
  if (match !== 'some' && match !== 'every') {
    throw new CriteriaError('INVALID_OPERATOR', `Unknown array match "${quote(node.match)}"`);
  }
  return Object.freeze({
    kind: 'arrayContains',
    field,
    match,
    values: freezeList(node.values, field),
  });
}

export function freezeFilter(node: unknown, depth = 1): FilterNode {
  assertDepth(depth);
  if (!isRecord(node)) {
    throw new CriteriaError('INVALID_FORMAT', 'A filter must be an object');
  }
  switch (node.kind) {
    case 'and':
    case 'or':
      return Object.freeze({
        kind: node.kind,
        filters: freezeChildren(node.filters, node.kind, depth),
      });
    case 'not':
      return Object.freeze({ kind: 'not', filter: freezeFilter(node.filter, depth + 1) });
    case 'compare':
      return freezeComparison(node);
    case 'between':
      return freezeBetween(node);
    case 'in':
    case 'notIn': {
      const field = assertField(node.field);
      return Object.freeze({ kind: node.kind, field, values: freezeList(node.values, field) });
    }
    case 'text':
      return freezeText(node);
    case 'isNull':
    case 'arrayEmpty': {
      const field = assertField(node.field);
      return Object.freeze({ kind: node.kind, field, value: freezeBoolean(node.value, field) });
    }
    case 'arrayContains':
      return freezeArrayContains(node);
    default:
      throw new CriteriaError('INVALID_OPERATOR', `Unknown filter kind "${quote(node.kind)}"`);
  }
}

export function freezeOrder(order: unknown): readonly OrderNode[] {
  if (!Array.isArray(order)) {
    throw new CriteriaError('INVALID_ORDER', 'The order must be a list');
  }
  const seen = new Set<string>();
  return Object.freeze(
    order.map((item: unknown) => {
      if (!isRecord(item)) {
        throw new CriteriaError('INVALID_ORDER', 'Each order item must be an object');
      }
      const field = assertField(item.field);
      const direction = item.direction as SortDirection;
      if (direction !== 'asc' && direction !== 'desc') {
        throw new CriteriaError('INVALID_ORDER', `Field "${quote(field)}" needs "asc" or "desc"`);
      }
      if (seen.has(field)) {
        throw new CriteriaError('INVALID_ORDER', `Field "${quote(field)}" is ordered twice`);
      }
      seen.add(field);
      return Object.freeze({ field, direction });
    }),
  );
}

export function freezePagination(pagination: unknown): Pagination | null {
  if (pagination == null) {
    return null;
  }
  if (!isRecord(pagination) || pagination.kind !== 'offset') {
    throw new CriteriaError('INVALID_PAGINATION', 'Unknown pagination');
  }
  const { limit, offset } = pagination;
  if (limit !== null && !(Number.isSafeInteger(limit) && (limit as number) >= 1)) {
    throw new CriteriaError('INVALID_PAGINATION', '"limit" must be an integer from 1');
  }
  if (!(Number.isSafeInteger(offset) && (offset as number) >= 0)) {
    throw new CriteriaError('INVALID_PAGINATION', '"offset" must be an integer from 0');
  }
  if (limit === null && offset === 0) {
    return null;
  }
  return Object.freeze({ kind: 'offset', limit: limit as number | null, offset: offset as number });
}
