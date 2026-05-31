import { describe, expect, it } from '@jest/globals';
import { toArray, ConvertError } from '../../src/convert';

function expectConvertError(fn: () => void, expectedMessage: string): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(ConvertError);
  expect((err as ConvertError).message).toBe(expectedMessage);
}

describe('toArray', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('array → same reference returned', () => {
    it('[1,2,3] → same reference', () => {
      const a = [1, 2, 3];
      expect(toArray(a)).toBe(a);
    });
    it('[] → same reference', () => {
      const a: unknown[] = [];
      expect(toArray(a)).toBe(a);
    });
    it('mixed-type array → same reference', () => {
      const a = [1, 'two', true, null];
      expect(toArray(a)).toBe(a);
    });
  });

  describe('JSON array string → parsed', () => {
    it('"[1,2,3]" → [1,2,3]', () => expect(toArray('[1,2,3]')).toEqual([1, 2, 3]));
    it('"[]" → []', () => expect(toArray('[]')).toEqual([]));
    it('\'["a","b"]\' → ["a","b"]', () => expect(toArray('["a","b"]')).toEqual(['a', 'b']));
    it('"[true,false]" → [true,false]', () => expect(toArray('[true,false]')).toEqual([true, false]));
    it('"[null,null]" → [null,null]', () => expect(toArray('[null,null]')).toEqual([null, null]));
    it('\'[{"a":1}]\' → [{a:1}]', () => expect(toArray('[{"a":1}]')).toEqual([{ a: 1 }]));
    it('"[[1,2],[3,4]]" → nested', () => expect(toArray('[[1,2],[3,4]]')).toEqual([[1, 2], [3, 4]]));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('invalid strings — message quotes the ORIGINAL string', () => {
    it('"hello" → \'Cannot convert "hello" to array\'', () =>
      expectConvertError(() => toArray('hello'), 'Cannot convert "hello" to array'));
    it('"" → \'Cannot convert "" to array\'', () =>
      expectConvertError(() => toArray(''), 'Cannot convert "" to array'));
    it('"null" → \'Cannot convert "null" to array\'', () =>
      expectConvertError(() => toArray('null'), 'Cannot convert "null" to array'));
    it('"true" → \'Cannot convert "true" to array\'', () =>
      expectConvertError(() => toArray('true'), 'Cannot convert "true" to array'));
    it('"42" → \'Cannot convert "42" to array\'', () =>
      expectConvertError(() => toArray('42'), 'Cannot convert "42" to array'));
    it('"{}" → \'Cannot convert "{}" to array\'', () =>
      expectConvertError(() => toArray('{}'), 'Cannot convert "{}" to array'));
    it('"[1,2,]" → \'Cannot convert "[1,2,]" to array\' (invalid JSON)', () =>
      expectConvertError(() => toArray('[1,2,]'), 'Cannot convert "[1,2,]" to array'));
    it('" hello " → spaces preserved in message', () =>
      expectConvertError(() => toArray(' hello '), 'Cannot convert " hello " to array'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to array"  (NOT "object")', () =>
      expectConvertError(() => toArray(null), 'Cannot convert null to array'));
    it('undefined → "Cannot convert undefined to array"', () =>
      expectConvertError(() => toArray(undefined), 'Cannot convert undefined to array'));
  });

  describe('numbers — show the value  (NOT "number")', () => {
    it('42 → "Cannot convert 42 to array"', () =>
      expectConvertError(() => toArray(42), 'Cannot convert 42 to array'));
    it('0 → "Cannot convert 0 to array"', () =>
      expectConvertError(() => toArray(0), 'Cannot convert 0 to array'));
    it('NaN → "Cannot convert NaN to array"', () =>
      expectConvertError(() => toArray(NaN), 'Cannot convert NaN to array'));
  });

  describe('booleans — show the value', () => {
    it('true → "Cannot convert true to array"  (NOT "boolean")', () =>
      expectConvertError(() => toArray(true), 'Cannot convert true to array'));
    it('false → "Cannot convert false to array"', () =>
      expectConvertError(() => toArray(false), 'Cannot convert false to array'));
  });

  describe('plain objects — show JSON value', () => {
    it('{} → "Cannot convert {} to array"', () =>
      expectConvertError(() => toArray({}), 'Cannot convert {} to array'));
    it('{ a: 1 } → \'Cannot convert {"a":1} to array\'', () =>
      expectConvertError(() => toArray({ a: 1 }), 'Cannot convert {"a":1} to array'));
  });

  describe('functions — show [Function]', () => {
    it('arrow fn → "Cannot convert [Function] to array"', () =>
      expectConvertError(() => toArray(() => [1, 2]), 'Cannot convert [Function] to array'));
    it('named fn → "Cannot convert [Function: getItems] to array"', () =>
      expectConvertError(() => toArray(function getItems() {}), 'Cannot convert [Function: getItems] to array'));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("x") → "Cannot convert Symbol(x) to array"  (NOT "symbol")', () =>
      expectConvertError(() => toArray(Symbol('x')), 'Cannot convert Symbol(x) to array'));
    it('Symbol() → "Cannot convert Symbol() to array"', () =>
      expectConvertError(() => toArray(Symbol()), 'Cannot convert Symbol() to array'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to array"  (NOT "bigint")', () =>
      expectConvertError(() => toArray(BigInt(1)), 'Cannot convert BigInt(1) to array'));
  });

  describe('well-known objects — show type name  (NOT generic "object")', () => {
    it('new Map() → "Cannot convert [Map] to array" (iterable but not Array)', () =>
      expectConvertError(() => toArray(new Map()), 'Cannot convert [Map] to array'));
    it('new Set([1,2]) → "Cannot convert [Set] to array" (iterable but not Array)', () =>
      expectConvertError(() => toArray(new Set([1, 2])), 'Cannot convert [Set] to array'));
    it('new Date() → "Cannot convert [Date] to array"', () =>
      expectConvertError(() => toArray(new Date()), 'Cannot convert [Date] to array'));
    it('new Error("x") → "Cannot convert [Error] to array"', () =>
      expectConvertError(() => toArray(new Error('x')), 'Cannot convert [Error] to array'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to array"', () =>
      expectConvertError(() => toArray(new Promise(() => {})), 'Cannot convert [Promise] to array'));
    it('new Uint8Array([1,2,3]) → "Cannot convert [Uint8Array] to array" (TypedArray ≠ Array)', () =>
      expectConvertError(() => toArray(new Uint8Array([1, 2, 3])), 'Cannot convert [Uint8Array] to array'));
    it('generator object → "Cannot convert [Generator] to array" (iterable but not Array)', () => {
      function* gen() { yield 1; yield 2; }
      expectConvertError(() => toArray(gen()), 'Cannot convert [Generator] to array');
    });
  });
});
