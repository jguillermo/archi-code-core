import { compareValues, isDate, valuesEqual, visitFilter } from '@archi-code/criteria';
import type {
  ComparisonOperator,
  CompareNode,
  Criteria,
  CriteriaScalar,
  FilterNode,
  TextNode,
} from '@archi-code/criteria';
import { readPath } from './read-path';

function comparable(value: unknown, target: CriteriaScalar): boolean {
  if (isDate(target)) {
    return isDate(value);
  }
  return typeof value === typeof target;
}

function compare(value: unknown, operator: ComparisonOperator, target: CriteriaScalar): boolean {
  if (operator === 'eq') {
    return valuesEqual(value, target);
  }
  if (operator === 'ne') {
    return !Array.isArray(value) && !valuesEqual(value, target);
  }
  if (!comparable(value, target)) {
    return false;
  }
  const order = compareValues(value, target);
  switch (operator) {
    case 'gt':
      return order > 0;
    case 'gte':
      return order >= 0;
    case 'lt':
      return order < 0;
    default:
      return order <= 0;
  }
}

function compareNode(item: unknown, node: CompareNode): boolean {
  return compare(readPath(item, node.field), node.operator, node.value);
}

const INSENSITIVE_PATTERNS = new WeakMap<TextNode, RegExp>();

function insensitivePattern(node: TextNode): RegExp {
  let pattern = INSENSITIVE_PATTERNS.get(node);
  if (pattern === undefined) {
    const literal = node.value.replace(/[\^$\\.*+?()[\]{}|/]/g, '\\$&');
    const source =
      node.operator === 'startsWith'
        ? `^${literal}`
        : node.operator === 'endsWith'
          ? `${literal}$`
          : literal;
    pattern = new RegExp(source, 'iu');
    INSENSITIVE_PATTERNS.set(node, pattern);
  }
  return pattern;
}

function textMatches(value: unknown, node: TextNode): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  if (!node.caseSensitive) {
    return insensitivePattern(node).test(value);
  }
  switch (node.operator) {
    case 'contains':
      return value.includes(node.value);
    case 'startsWith':
      return value.startsWith(node.value);
    default:
      return value.endsWith(node.value);
  }
}

function contains(list: unknown, target: CriteriaScalar): boolean {
  return Array.isArray(list) && list.some((element) => valuesEqual(element, target));
}

export function matchesFilter(item: unknown, filter: FilterNode | null): boolean {
  if (filter === null) {
    return true;
  }
  return visitFilter<boolean>(filter, {
    compare: (node) => compareNode(item, node),
    between: (node) => {
      const value = readPath(item, node.field);
      return compare(value, 'gte', node.min) && compare(value, 'lte', node.max);
    },
    in: (node) => node.values.some((target) => valuesEqual(readPath(item, node.field), target)),
    notIn: (node) => {
      const value = readPath(item, node.field);
      return !Array.isArray(value) && !node.values.some((target) => valuesEqual(value, target));
    },
    text: (node) => textMatches(readPath(item, node.field), node),
    isNull: (node) => (readPath(item, node.field) == null) === node.value,
    arrayContains: (node) => {
      const list = readPath(item, node.field);
      const has = (target: CriteriaScalar): boolean => contains(list, target);
      return node.match === 'some' ? node.values.some(has) : node.values.every(has);
    },
    arrayEmpty: (node) => {
      const list = readPath(item, node.field);
      return Array.isArray(list) && (list.length === 0) === node.value;
    },
    and: (node) => node.filters.every((child) => matchesFilter(item, child)),
    or: (node) => node.filters.some((child) => matchesFilter(item, child)),
    not: (node) => !matchesFilter(item, node.filter),
  });
}

export function matches<T>(item: T, criteria: Criteria<T>): boolean {
  return matchesFilter(item, criteria.filter);
}
