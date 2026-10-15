import { isDate } from '@archi-code/criteria';
import type { Criteria, FilterNode } from '@archi-code/criteria';
import { ordersLikeCriteria } from './key-order';

export type IndexedDbKey = string | number | Date;

export interface KeyBounds {
  readonly lower?: IndexedDbKey;
  readonly upper?: IndexedDbKey;
  readonly lowerOpen: boolean;
  readonly upperOpen: boolean;
}

export interface IndexInfo {
  readonly name: string | null;
  readonly keyPath: string;
}

export interface IndexedDbPlan {
  readonly index: string | null;
  readonly bounds: KeyBounds | null;
  readonly direction: 'next' | 'prev';
  readonly presorted: boolean;
}

interface Candidate {
  readonly field: string;
  readonly bounds: KeyBounds;
  readonly rank: number;
}

function isKey(value: unknown): value is IndexedDbKey {
  if (typeof value === 'string') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return isDate(value) && !Number.isNaN(value.getTime());
}

function nextPrefix(prefix: string): string | null {
  const last = prefix.charCodeAt(prefix.length - 1);
  if (prefix.length === 0 || last === 0xffff) {
    return null;
  }
  return prefix.slice(0, -1) + String.fromCharCode(last + 1);
}

function candidateOf(node: FilterNode): Candidate | null {
  if (node.kind === 'compare' && node.operator !== 'ne' && isKey(node.value)) {
    const value = node.value;
    if (node.operator !== 'eq' && !ordersLikeCriteria(value)) {
      return null;
    }
    switch (node.operator) {
      case 'eq':
        return {
          field: node.field,
          rank: 0,
          bounds: { lower: value, upper: value, lowerOpen: false, upperOpen: false },
        };
      case 'gt':
      case 'gte':
        return {
          field: node.field,
          rank: 2,
          bounds: { lower: value, lowerOpen: node.operator === 'gt', upperOpen: false },
        };
      default:
        return {
          field: node.field,
          rank: 2,
          bounds: { upper: value, lowerOpen: false, upperOpen: node.operator === 'lt' },
        };
    }
  }
  if (node.kind === 'between') {
    if (!ordersLikeCriteria(node.min) || !ordersLikeCriteria(node.max)) {
      return null;
    }
    return {
      field: node.field,
      rank: 1,
      bounds: { lower: node.min, upper: node.max, lowerOpen: false, upperOpen: false },
    };
  }
  if (node.kind === 'text' && node.operator === 'startsWith' && node.caseSensitive) {
    const upper = nextPrefix(node.value);
    return upper === null
      ? null
      : {
          field: node.field,
          rank: 1,
          bounds: { lower: node.value, upper, lowerOpen: false, upperOpen: true },
        };
  }
  return null;
}

function requiredNodes(filter: FilterNode | null): FilterNode[] {
  if (filter === null) {
    return [];
  }
  return filter.kind === 'and' ? filter.filters.flatMap(requiredNodes) : [filter];
}

export function planIndexedDbQuery(
  criteria: Criteria<unknown>,
  indexes: readonly IndexInfo[],
): IndexedDbPlan {
  const byField = new Map<string, IndexInfo>();
  for (const index of indexes) {
    if (!byField.has(index.keyPath)) {
      byField.set(index.keyPath, index);
    }
  }
  const order = criteria.order;
  const sortField = order.length === 1 ? order[0].field : null;
  const direction = order.length === 1 && order[0].direction === 'desc' ? 'prev' : 'next';
  const candidates = requiredNodes(criteria.filter)
    .map(candidateOf)
    .filter(
      (candidate): candidate is Candidate => candidate !== null && byField.has(candidate.field),
    )
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        Number(right.field === sortField) - Number(left.field === sortField),
    );
  const best = candidates[0];
  if (best !== undefined) {
    const sortedByIndex = best.field === sortField;
    return {
      index: (byField.get(best.field) as IndexInfo).name,
      bounds: best.bounds,
      direction: sortedByIndex ? direction : 'next',
      presorted: sortedByIndex || order.length === 0,
    };
  }
  if (sortField !== null && byField.get(sortField)?.name === null) {
    return { index: null, bounds: null, direction, presorted: true };
  }
  return { index: null, bounds: null, direction: 'next', presorted: order.length === 0 };
}
