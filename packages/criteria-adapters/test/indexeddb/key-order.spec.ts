import { describe, expect, it } from '@jest/globals';
import { ordersLikeCriteria } from '../../src/indexeddb/key-order';

describe('ordersLikeCriteria', () => {
  it.each([['plain text'], ['퟿'], [42], [new Date(0)], [null]])(
    'is true for %p, which IndexedDB orders like the criteria',
    (value) => {
      expect(ordersLikeCriteria(value)).toBe(true);
    },
  );

  it.each([['\uD800'], ['a'], ['ｱ'], ['\u{1F600}']])(
    'is false for text with code units from U+D800: %p',
    (value) => {
      expect(ordersLikeCriteria(value)).toBe(false);
    },
  );
});
