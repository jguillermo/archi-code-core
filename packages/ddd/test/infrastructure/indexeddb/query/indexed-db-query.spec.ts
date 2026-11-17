import { describe, expect, it } from 'vitest';
import { IndexedDbQueryCheck } from '../../../../src/infrastructure/indexeddb/query/indexed-db-query';

const invalidQuery = expect.objectContaining({ reason: 'invalid_query' });

describe('IndexedDbQueryCheck: a query with every option decided', () => {
  it('reads the whole table in key order when nothing is asked', () => {
    expect(IndexedDbQueryCheck.shape({}, 'orders')).toStrictEqual({
      index: null,
      range: null,
      direction: 'next',
      filter: null,
      compare: null,
      offset: 0,
      limit: null,
      after: null,
    });
  });

  it('keeps what the query asks', () => {
    const filter = (): boolean => true;
    const compare = (): number => 0;
    const range = IDBKeyRange.only('cus-1');

    expect(
      IndexedDbQueryCheck.shape(
        { index: 'byCustomer', range, direction: 'prev', filter, compare, offset: 20, limit: 10 },
        'orders',
      ),
    ).toStrictEqual({
      index: 'byCustomer',
      range,
      direction: 'prev',
      filter,
      compare,
      offset: 20,
      limit: 10,
      after: null,
    });
  });

  it.each([
    ['a direction IndexedDB tables do not read', { direction: 'nextunique' }],
    ['a negative offset', { offset: -1 }],
    ['an offset that is not an integer', { offset: 1.5 }],
    ['a negative limit', { limit: -1 }],
    ['a limit that is not a number', { limit: '10' }],
    ['a token together with an order computed in memory', { compare: () => 0, after: 'token' }],
  ])('refuses %s', (_case, query) => {
    expect(() => IndexedDbQueryCheck.shape(query as never, 'orders')).toThrow(invalidQuery);
  });

  it('accepts a limit of zero', () => {
    expect(IndexedDbQueryCheck.shape({ limit: 0 }, 'orders').limit).toBe(0);
  });
});
