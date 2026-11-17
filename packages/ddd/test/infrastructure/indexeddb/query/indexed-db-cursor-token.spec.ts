import { describe, expect, it } from 'vitest';
import { IndexedDbCursorToken } from '../../../../src/infrastructure/indexeddb/query/indexed-db-cursor-token';

const byCustomer = { index: 'byCustomer', direction: 'next' } as const;
const invalidQuery = expect.objectContaining({ reason: 'invalid_query' });

function tokenOf(content: unknown): string {
  return btoa(JSON.stringify(content)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('IndexedDbCursorToken: the position a query continues from', () => {
  it.each([
    ['a text key', 'cus-1'],
    ['a text key outside ASCII', 'cliente-ñandú-??>>~~'],
    ['a number key', 42.5],
    ['an infinite key', -Infinity],
    ['a date key', new Date('2026-11-17T10:00:00.000Z')],
    ['a key of several fields', ['cus-1', 3, [new Date(0)]]],
  ])('gives back %s and the id of the row', (_case, key) => {
    const token = IndexedDbCursorToken.encode({ key, primaryKey: 'ord-1' }, byCustomer);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(IndexedDbCursorToken.decode(token, byCustomer)).toStrictEqual({
      key,
      primaryKey: 'ord-1',
    });
  });

  it('cannot continue from a binary key', () => {
    expect(() =>
      IndexedDbCursorToken.encode({ key: new Uint8Array([1]), primaryKey: 'ord-1' }, byCustomer),
    ).toThrow(invalidQuery);
  });

  it.each([
    ['another index', { index: null, direction: 'next' }],
    ['another direction', { index: 'byCustomer', direction: 'prev' }],
  ])('refuses a token of %s', (_case, scope) => {
    const token = IndexedDbCursorToken.encode({ key: 'cus-1', primaryKey: 'ord-1' }, byCustomer);

    expect(() => IndexedDbCursorToken.decode(token, scope as typeof byCustomer)).toThrow(
      'IndexedDB invalid_query: the after token belongs to another index or direction',
    );
  });

  it.each([
    ['text that is not base64', '%%%'],
    ['bytes that are not UTF-8', btoa('\xff\xfe')],
    ['text that is not JSON', btoa('not json')],
    ['a JSON that is no token', tokenOf(null)],
    ['another token version', tokenOf([2, 'byCustomer', 'next', ['s', 'a'], ['s', 'b']])],
    ['a token without keys', tokenOf([1, 'byCustomer', 'next'])],
    ['a text key that is no text', tokenOf([1, 'byCustomer', 'next', ['s', 1], ['s', 'b']])],
    ['a number key that is no text', tokenOf([1, 'byCustomer', 'next', ['n', 1], ['s', 'b']])],
    ['a date key that is no number', tokenOf([1, 'byCustomer', 'next', ['d', 'x'], ['s', 'b']])],
    ['a list key that is no list', tokenOf([1, 'byCustomer', 'next', ['a', 'x'], ['s', 'b']])],
    ['an unknown kind of key', tokenOf([1, 'byCustomer', 'next', ['z', 'x'], ['s', 'b']])],
  ])('refuses %s', (_case, token) => {
    expect(() => IndexedDbCursorToken.decode(token, byCustomer)).toThrow(
      'IndexedDB invalid_query: after is not a token returned by find',
    );
  });
});
