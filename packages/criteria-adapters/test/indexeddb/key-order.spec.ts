import { describe, expect, it } from 'vitest';
import { ordersLikeCriteria } from '../../src/indexeddb/key-order';

describe('ordersLikeCriteria', () => {
  it.each([['plain text'], ['퟿'], [42], [new Date(0)], [null]])(
    'is true for %o, which IndexedDB orders like the criteria',
    (value) => {
      expect(ordersLikeCriteria(value)).toBe(true);
    },
  );

  it.each([['\uD800'], ['a'], ['ｱ'], ['\u{1F600}']])(
    'is false for text with code units from U+D800: %o',
    (value) => {
      expect(ordersLikeCriteria(value)).toBe(false);
    },
  );
});
