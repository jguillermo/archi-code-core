import { describe, expect, it } from 'vitest';
import {
  assertDepth,
  assertUrlLength,
  assertWithinLimits,
  DEFAULT_CRITERIA_LIMITS,
  MAX_FILTER_DEPTH,
  resolveLimits,
} from '../src/criteria-limits';
import { FilterNode } from '../src/filter-node';
import { OrderNode } from '../src/order';
import { codeOf } from './support/code-of';

const LIMITS = resolveLimits({
  maxDepth: 3,
  maxNodes: 5,
  maxListSize: 2,
  maxTextLength: 4,
  maxOrderFields: 1,
  maxUrlLength: 10,
});

const name = (value: string): FilterNode => ({
  kind: 'compare',
  field: 'name',
  operator: 'eq',
  value,
});

function within(filter: FilterNode | null, order: readonly OrderNode[] = []): string {
  return codeOf(() => assertWithinLimits(filter, order, LIMITS));
}

describe('DEFAULT_CRITERIA_LIMITS', () => {
  it('holds the limits for input from outside', () => {
    expect(DEFAULT_CRITERIA_LIMITS).toEqual({
      maxDepth: 16,
      maxNodes: 256,
      maxListSize: 1000,
      maxTextLength: 1024,
      maxOrderFields: 8,
      maxUrlLength: 8192,
    });
    expect(Object.isFrozen(DEFAULT_CRITERIA_LIMITS)).toBe(true);
  });
});

describe('assertDepth', () => {
  it(`accepts up to ${MAX_FILTER_DEPTH} levels`, () => {
    expect(codeOf(() => assertDepth(MAX_FILTER_DEPTH))).toBe('NO_ERROR');
    expect(codeOf(() => assertDepth(MAX_FILTER_DEPTH + 1))).toBe('LIMIT_EXCEEDED');
  });
});

describe('resolveLimits', () => {
  it('returns the defaults without limits and fills the missing ones', () => {
    expect(resolveLimits(undefined)).toBe(DEFAULT_CRITERIA_LIMITS);
    expect(resolveLimits({ maxNodes: 10, maxDepth: undefined })).toEqual({
      ...DEFAULT_CRITERIA_LIMITS,
      maxNodes: 10,
    });
    expect(Object.isFrozen(resolveLimits({ maxNodes: 10 }))).toBe(true);
  });

  it.each([
    [null],
    [[]],
    ['strict'],
    [{ maxRows: 1 }],
    [{ maxNodes: 0 }],
    [{ maxNodes: 1.5 }],
    [{ maxNodes: '10' }],
    [{ maxNodes: Number.MAX_SAFE_INTEGER + 1 }],
    [{ maxDepth: MAX_FILTER_DEPTH + 1 }],
  ])('rejects %o', (limits) => {
    expect(codeOf(() => resolveLimits(limits))).toBe('INVALID_SCHEMA');
  });
});

describe('assertUrlLength', () => {
  it('rejects a text longer than maxUrlLength and ignores what is not text', () => {
    expect(codeOf(() => assertUrlLength('a'.repeat(10), LIMITS))).toBe('NO_ERROR');
    expect(codeOf(() => assertUrlLength('a'.repeat(11), LIMITS))).toBe('LIMIT_EXCEEDED');
    expect(codeOf(() => assertUrlLength(42, LIMITS))).toBe('NO_ERROR');
  });
});

describe('assertWithinLimits', () => {
  it('accepts a criteria inside every limit', () => {
    expect(within(null)).toBe('NO_ERROR');
    expect(
      within(
        {
          kind: 'and',
          filters: [
            { kind: 'not', filter: name('ana') },
            { kind: 'in', field: 'tag', values: ['a', 'b'] },
            { kind: 'between', field: 'age', min: 1, max: 9 },
          ],
        },
        [{ field: 'name', direction: 'asc' }],
      ),
    ).toBe('NO_ERROR');
  });

  it('rejects a filter nested deeper than maxDepth', () => {
    const deep: FilterNode = { kind: 'not', filter: { kind: 'not', filter: name('a') } };
    expect(within(deep)).toBe('NO_ERROR');
    expect(within({ kind: 'not', filter: deep })).toBe('LIMIT_EXCEEDED');
  });

  it('rejects more nodes than maxNodes', () => {
    const or = (count: number): FilterNode => ({
      kind: 'or',
      filters: Array.from({ length: count }, () => name('a')),
    });
    expect(within(or(4))).toBe('NO_ERROR');
    expect(within(or(5))).toBe('LIMIT_EXCEEDED');
  });

  it.each<[string, FilterNode]>([
    ['in', { kind: 'in', field: 'tag', values: ['a', 'b', 'c'] }],
    ['notIn', { kind: 'notIn', field: 'tag', values: [1, 2, 3] }],
    ['arrayContains', { kind: 'arrayContains', field: 'tag', match: 'some', values: [1, 2, 3] }],
  ])('rejects a %s list longer than maxListSize', (_kind, node) => {
    expect(within(node)).toBe('LIMIT_EXCEEDED');
  });

  it.each<[string, FilterNode]>([
    ['a compare value', name('alice')],
    ['a field', { kind: 'isNull', field: 'nickname', value: true }],
    ['a list value', { kind: 'in', field: 'tag', values: ['alice'] }],
    ['a list field', { kind: 'in', field: 'nickname', values: ['a'] }],
    ['a range bound', { kind: 'between', field: 'name', min: 'a', max: 'alice' }],
    ['a range field', { kind: 'between', field: 'nickname', min: 1, max: 2 }],
    [
      'a text value',
      { kind: 'text', field: 'name', operator: 'contains', value: 'alice', caseSensitive: true },
    ],
  ])('rejects %s longer than maxTextLength', (_name, node) => {
    expect(within(node)).toBe('LIMIT_EXCEEDED');
  });

  it('rejects more order fields than maxOrderFields and long order fields', () => {
    const order = (field: string): OrderNode => ({ field, direction: 'asc' });
    expect(within(null, [order('a'), order('b')])).toBe('LIMIT_EXCEEDED');
    expect(within(null, [order('nickname')])).toBe('LIMIT_EXCEEDED');
  });
});
