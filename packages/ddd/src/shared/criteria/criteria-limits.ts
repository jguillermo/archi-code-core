import { CriteriaError, quote } from './criteria-error';
import { CriteriaValue } from './criteria-value';
import { FilterNode } from './filter-node';
import { OrderNode } from './order';

export interface CriteriaLimits {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxListSize: number;
  readonly maxTextLength: number;
  readonly maxOrderFields: number;
  readonly maxUrlLength: number;
}

export const MAX_FILTER_DEPTH = 64;

export const DEFAULT_CRITERIA_LIMITS: CriteriaLimits = Object.freeze({
  maxDepth: 16,
  maxNodes: 256,
  maxListSize: 1000,
  maxTextLength: 1024,
  maxOrderFields: 8,
  maxUrlLength: 8192,
});

export function assertDepth(depth: number): void {
  if (depth > MAX_FILTER_DEPTH) {
    throw new CriteriaError(
      'LIMIT_EXCEEDED',
      `The filter is nested deeper than ${MAX_FILTER_DEPTH} levels`,
    );
  }
}

export function resolveLimits(limits: unknown): CriteriaLimits {
  if (limits === undefined) {
    return DEFAULT_CRITERIA_LIMITS;
  }
  if (limits === null || typeof limits !== 'object' || Array.isArray(limits)) {
    throw new CriteriaError('INVALID_SCHEMA', '"limits" must be an object');
  }
  const resolved: Record<string, number> = { ...DEFAULT_CRITERIA_LIMITS };
  for (const [name, value] of Object.entries(limits)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_CRITERIA_LIMITS, name)) {
      throw new CriteriaError('INVALID_SCHEMA', `Unknown limit "${quote(name)}"`);
    }
    if (value === undefined) {
      continue;
    }
    if (!(Number.isSafeInteger(value) && (value as number) >= 1)) {
      throw new CriteriaError('INVALID_SCHEMA', `"${name}" must be an integer from 1`);
    }
    resolved[name] = value as number;
  }
  if (resolved.maxDepth > MAX_FILTER_DEPTH) {
    throw new CriteriaError(
      'INVALID_SCHEMA',
      `"maxDepth" cannot be greater than ${MAX_FILTER_DEPTH}`,
    );
  }
  return Object.freeze(resolved as unknown as CriteriaLimits);
}

export function assertUrlLength(text: unknown, limits: CriteriaLimits): void {
  if (typeof text === 'string' && text.length > limits.maxUrlLength) {
    throw new CriteriaError(
      'LIMIT_EXCEEDED',
      `The criteria text is longer than ${limits.maxUrlLength} characters`,
    );
  }
}

function assertText(value: unknown, limits: CriteriaLimits): void {
  if (typeof value === 'string' && value.length > limits.maxTextLength) {
    throw new CriteriaError(
      'LIMIT_EXCEEDED',
      `A field or a value is longer than ${limits.maxTextLength} characters`,
    );
  }
}

function assertList(values: readonly unknown[], field: string, limits: CriteriaLimits): void {
  if (values.length > limits.maxListSize) {
    throw new CriteriaError(
      'LIMIT_EXCEEDED',
      `Field "${quote(field)}" has more than ${limits.maxListSize} values`,
    );
  }
  values.forEach((value) => assertText(value, limits));
}

export function assertWithinLimits(
  filter: FilterNode | null,
  order: readonly OrderNode[],
  limits: CriteriaLimits,
): void {
  if (order.length > limits.maxOrderFields) {
    throw new CriteriaError(
      'LIMIT_EXCEEDED',
      `The order has more than ${limits.maxOrderFields} fields`,
    );
  }
  order.forEach((item) => assertText(item.field, limits));
  let nodes = 0;
  const measure = (node: FilterNode, depth: number): void => {
    nodes += 1;
    if (nodes > limits.maxNodes) {
      throw new CriteriaError(
        'LIMIT_EXCEEDED',
        `The filter has more than ${limits.maxNodes} conditions`,
      );
    }
    if (depth > limits.maxDepth) {
      throw new CriteriaError(
        'LIMIT_EXCEEDED',
        `The filter is nested deeper than ${limits.maxDepth} levels`,
      );
    }
    switch (node.kind) {
      case 'and':
      case 'or':
        node.filters.forEach((child) => measure(child, depth + 1));
        return;
      case 'not':
        measure(node.filter, depth + 1);
        return;
      case 'in':
      case 'notIn':
      case 'arrayContains':
        assertText(node.field, limits);
        assertList(node.values, node.field, limits);
        return;
      case 'between':
        assertText(node.field, limits);
        assertList([node.min, node.max], node.field, limits);
        return;
      default:
        assertText(node.field, limits);
        assertText((node as { value?: CriteriaValue }).value, limits);
    }
  };
  if (filter !== null) {
    measure(filter, 1);
  }
}
