import { describe, expect, it } from 'vitest';
import { IndexedDbCursorToken } from '../../../src/infrastructure/indexeddb/indexed-db-cursor-token';

const scope = { index: 'byCustomer', direction: 'next' as const };

describe('IndexedDbCursorToken: the position of a page as an opaque text', () => {
  it.each([
    ['text', 'cus-1', 'ord-1'],
    ['numbers', 42.5, -7],
    ['infinite numbers', Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    ['dates', new Date('2026-03-01T09:30:00Z'), new Date(0)],
    ['compound keys', ['paid', new Date('2026-03-01T00:00:00Z')], ['ord', 1]],
    ['non-ASCII text', 'cliente-ñ', 'pedido-€'],
  ])('round-trips %s', (_, key, primaryKey) => {
    const token = IndexedDbCursorToken.encode({ key, primaryKey }, scope);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(IndexedDbCursorToken.decode(token, scope)).toStrictEqual({ key, primaryKey });
  });

  it('round-trips binary keys as an ArrayBuffer, from a buffer or a view', () => {
    const bytes = new Uint8Array([0, 1, 254, 255]);

    for (const key of [bytes.buffer, new DataView(bytes.buffer, 1, 2)]) {
      const decoded = IndexedDbCursorToken.decode(
        IndexedDbCursorToken.encode({ key, primaryKey: 1 }, scope),
        scope,
      );
      expect(decoded.key).toBeInstanceOf(ArrayBuffer);
    }
    const view = IndexedDbCursorToken.decode(
      IndexedDbCursorToken.encode({ key: new DataView(bytes.buffer, 1, 2), primaryKey: 1 }, scope),
      scope,
    );
    expect(Array.from(new Uint8Array(view.key as ArrayBuffer))).toStrictEqual([1, 254]);
  });

  it('refuses a token of another index or direction', () => {
    const token = IndexedDbCursorToken.encode({ key: 'cus-1', primaryKey: 'ord-1' }, scope);

    expect(() => IndexedDbCursorToken.decode(token, { index: null, direction: 'next' })).toThrow(
      'the after token belongs to another index or direction',
    );
  });
});
