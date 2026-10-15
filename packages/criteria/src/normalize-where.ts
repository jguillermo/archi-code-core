import { CriteriaError, quote } from './criteria-error';
import { assertDepth } from './criteria-limits';
import { CriteriaScalar, isRecord } from './criteria-value';
import { ComparisonOperator, FilterNode, TextOperator } from './filter-node';

function combine(nodes: FilterNode[]): FilterNode | null {
  if (nodes.length === 0) {
    return null;
  }
  return nodes.length === 1 ? nodes[0] : { kind: 'and', filters: nodes };
}

function list(value: unknown, field: string, operator: string): CriteriaScalar[] {
  if (!Array.isArray(value)) {
    throw new CriteriaError(
      'INVALID_VALUE',
      `"${quote(operator)}" on "${quote(field)}" needs a list`,
    );
  }
  if (value.length === 0) {
    throw new CriteriaError(
      'EMPTY_LIST',
      `"${quote(operator)}" on "${quote(field)}" needs at least one value`,
    );
  }
  return [...value];
}

function operatorNode(
  field: string,
  operator: string,
  value: unknown,
  caseSensitive: boolean,
): FilterNode {
  switch (operator) {
    case 'eq':
    case 'ne':
      return value === null
        ? { kind: 'isNull', field, value: operator === 'eq' }
        : { kind: 'compare', field, operator, value: value as CriteriaScalar };
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return {
        kind: 'compare',
        field,
        operator: operator as ComparisonOperator,
        value: value as CriteriaScalar,
      };
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new CriteriaError('INVALID_VALUE', `"between" on "${quote(field)}" needs [min, max]`);
      }
      return { kind: 'between', field, min: value[0], max: value[1] };
    }
    case 'in':
      return { kind: 'in', field, values: list(value, field, operator) };
    case 'nin':
      return { kind: 'notIn', field, values: list(value, field, operator) };
    case 'contains':
    case 'startsWith':
    case 'endsWith':
      return {
        kind: 'text',
        field,
        operator: operator as TextOperator,
        value: value as string,
        caseSensitive,
      };
    case 'isNull':
      return { kind: 'isNull', field, value: value as boolean };
    case 'has':
      return { kind: 'arrayContains', field, match: 'some', values: [value as CriteriaScalar] };
    case 'hasSome':
      return { kind: 'arrayContains', field, match: 'some', values: list(value, field, operator) };
    case 'hasEvery':
      return { kind: 'arrayContains', field, match: 'every', values: list(value, field, operator) };
    case 'isEmpty':
      return { kind: 'arrayEmpty', field, value: value as boolean };
    default:
      throw new CriteriaError(
        'INVALID_OPERATOR',
        `Unknown operator "${quote(operator)}" on "${quote(field)}"`,
      );
  }
}

const TEXT_KEYS = new Set(['contains', 'startsWith', 'endsWith']);

function fieldCondition(field: string, condition: Record<string, unknown>): FilterNode | null {
  const entries = Object.entries(condition).filter(([, value]) => value !== undefined);
  const mode = condition.mode;
  if (mode !== undefined && mode !== 'sensitive' && mode !== 'insensitive') {
    throw new CriteriaError(
      'INVALID_VALUE',
      `"mode" on "${quote(field)}" must be sensitive or insensitive`,
    );
  }
  if (mode !== undefined && !entries.some(([operator]) => TEXT_KEYS.has(operator))) {
    throw new CriteriaError(
      'INVALID_OPERATOR',
      `"mode" on "${quote(field)}" only applies to contains, startsWith and endsWith`,
    );
  }
  const nodes = entries
    .filter(([operator]) => operator !== 'mode')
    .map(([operator, value]) => operatorNode(field, operator, value, mode !== 'insensitive'));
  return combine(nodes);
}

function fieldFilter(field: string, raw: unknown): FilterNode | null {
  if (raw === null) {
    return { kind: 'isNull', field, value: true };
  }
  if (isRecord(raw)) {
    return fieldCondition(field, raw);
  }
  return { kind: 'compare', field, operator: 'eq', value: raw as CriteriaScalar };
}

function logical(kind: 'AND' | 'OR', raw: unknown, depth: number): FilterNode | null {
  if (!Array.isArray(raw)) {
    throw new CriteriaError('INVALID_FORMAT', `${kind} needs a list of conditions`);
  }
  if (raw.length === 0) {
    throw new CriteriaError('EMPTY_LIST', `${kind} needs at least one condition`);
  }
  const children = raw.map((where: unknown) => normalizeWhere(where, depth + 1));
  if (kind === 'AND') {
    return combine(children.filter((child): child is FilterNode => child !== null));
  }
  if (children.some((child) => child === null)) {
    return null;
  }
  const filters = children as FilterNode[];
  return filters.length === 1 ? filters[0] : { kind: 'or', filters };
}

function negate(raw: unknown, depth: number): FilterNode {
  const filter = normalizeWhere(raw, depth + 1);
  if (filter === null) {
    throw new CriteriaError('INVALID_VALUE', 'NOT needs at least one condition');
  }
  return { kind: 'not', filter };
}

export function normalizeWhere(where: unknown, depth = 1): FilterNode | null {
  assertDepth(depth);
  if (!isRecord(where)) {
    throw new CriteriaError('INVALID_FORMAT', '"where" must be an object');
  }
  const nodes: FilterNode[] = [];
  for (const [key, raw] of Object.entries(where)) {
    if (raw === undefined) {
      continue;
    }
    const node =
      key === 'AND' || key === 'OR'
        ? logical(key, raw, depth)
        : key === 'NOT'
          ? negate(raw, depth)
          : fieldFilter(key, raw);
    if (node !== null) {
      nodes.push(node);
    }
  }
  return combine(nodes);
}
