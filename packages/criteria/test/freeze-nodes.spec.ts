import { describe, expect, it } from '@jest/globals';
import { CriteriaError } from '../src/criteria-error';
import { freezeFilter, freezeOrder, freezePagination } from '../src/freeze-nodes';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return (error as CriteriaError).code;
  }
  return 'NO_ERROR';
}

describe('freezeFilter', () => {
  it.each([
    [null, 'INVALID_FORMAT'],
    [{ kind: 'xor' }, 'INVALID_OPERATOR'],
    [{ kind: 'and', filters: 'x' }, 'INVALID_FORMAT'],
    [{ kind: 'or', filters: [] }, 'EMPTY_LIST'],
    [{ kind: 'not', filter: null }, 'INVALID_FORMAT'],
    [{ kind: 'compare', field: '', operator: 'eq', value: 1 }, 'INVALID_FIELD'],
    [{ kind: 'compare', field: 'a', operator: 'like', value: 1 }, 'INVALID_OPERATOR'],
    [{ kind: 'compare', field: 'a', operator: 'eq', value: null }, 'INVALID_VALUE'],
    [{ kind: 'compare', field: 'a', operator: 'eq', value: {} }, 'INVALID_VALUE'],
    [{ kind: 'compare', field: 'a', operator: 'gt', value: true }, 'INVALID_VALUE'],
    [{ kind: 'between', field: 'a', min: 1, max: Infinity }, 'INVALID_VALUE'],
    [{ kind: 'in', field: 'a', values: 'x' }, 'INVALID_VALUE'],
    [{ kind: 'notIn', field: 'a', values: [] }, 'EMPTY_LIST'],
    [{ kind: 'in', field: 'a', values: [undefined] }, 'INVALID_VALUE'],
    [
      { kind: 'text', field: 'a', operator: 'matches', value: 'x', caseSensitive: true },
      'INVALID_OPERATOR',
    ],
    [
      { kind: 'text', field: 'a', operator: 'contains', value: 1, caseSensitive: true },
      'INVALID_VALUE',
    ],
    [
      { kind: 'text', field: 'a', operator: 'contains', value: 'x', caseSensitive: 1 },
      'INVALID_VALUE',
    ],
    [{ kind: 'isNull', field: 'a', value: 'yes' }, 'INVALID_VALUE'],
    [{ kind: 'arrayEmpty', field: 'a', value: undefined }, 'INVALID_VALUE'],
    [{ kind: 'arrayContains', field: 'a', match: 'any', values: [1] }, 'INVALID_OPERATOR'],
    [{ kind: 'arrayContains', field: 'a', match: 'every', values: [] }, 'EMPTY_LIST'],
    [{ kind: 'in', field: 'a', values: ['1', 1] }, 'INVALID_VALUE'],
    [{ kind: 'notIn', field: 'a', values: [new Date(0), 0] }, 'INVALID_VALUE'],
    [{ kind: 'arrayContains', field: 'a', match: 'some', values: [true, 'true'] }, 'INVALID_VALUE'],
    [
      { kind: 'text', field: 'a', operator: 'contains', value: '', caseSensitive: true },
      'INVALID_VALUE',
    ],
  ])('rejects %j with %s', (node, code) => {
    expect(codeOf(() => freezeFilter(node))).toBe(code);
  });

  it('accepts every valid node', () => {
    const node = {
      kind: 'or',
      filters: [
        { kind: 'not', filter: { kind: 'compare', field: 'a', operator: 'lte', value: 'z' } },
        { kind: 'between', field: 'd', min: new Date(1), max: new Date(1) },
        { kind: 'notIn', field: 'a', values: [true, false] },
        { kind: 'text', field: 'a', operator: 'endsWith', value: 'z', caseSensitive: false },
        { kind: 'arrayContains', field: 'a.b', match: 'every', values: [1] },
        { kind: 'arrayEmpty', field: 'a', value: true },
      ],
    };
    expect(freezeFilter(node)).toEqual(node);
  });
});

describe('freezeOrder', () => {
  it.each([
    ['x', 'INVALID_ORDER'],
    [[null], 'INVALID_ORDER'],
    [[{ field: 'a', direction: 'up' }], 'INVALID_ORDER'],
    [[{ field: 1, direction: 'asc' }], 'INVALID_FIELD'],
  ])('rejects %j', (order, code) => {
    expect(codeOf(() => freezeOrder(order))).toBe(code);
  });
});

describe('freezePagination', () => {
  it.each([
    ['x', 'INVALID_PAGINATION'],
    [{ kind: 'cursor' }, 'INVALID_PAGINATION'],
    [{ kind: 'offset', limit: '5', offset: 0 }, 'INVALID_PAGINATION'],
    [{ kind: 'offset', limit: 5, offset: undefined }, 'INVALID_PAGINATION'],
  ])('rejects %j', (pagination, code) => {
    expect(codeOf(() => freezePagination(pagination))).toBe(code);
  });

  it('returns null when nothing limits the result', () => {
    expect(freezePagination(undefined)).toBeNull();
    expect(freezePagination({ kind: 'offset', limit: null, offset: 0 })).toBeNull();
  });
});
