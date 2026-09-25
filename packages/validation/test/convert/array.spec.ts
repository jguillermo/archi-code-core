import { describe, expect, it } from '@jest/globals';
import { toArray, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';

const value = <T>(r: Converted<T>): T | null => r.value;

describe('toArray', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('array → same reference returned', () => {
    it('[1,2,3] → same reference', () => {
      const a = [1, 2, 3];
      expect(converted(toArray(a))).toBe(a);
    });
    it('[] → same reference', () => {
      const a: unknown[] = [];
      expect(converted(toArray(a))).toBe(a);
    });
    it('mixed-type array → same reference', () => {
      const a = [1, 'two', true, null];
      expect(converted(toArray(a))).toBe(a);
    });
  });

  describe('JSON array string → parsed', () => {
    it('"[1,2,3]" → [1,2,3]', () => expect(converted(toArray('[1,2,3]'))).toEqual([1, 2, 3]));
    it('"[]" → []', () => expect(converted(toArray('[]'))).toEqual([]));
    it('\'["a","b"]\' → ["a","b"]', () =>
      expect(converted(toArray('["a","b"]'))).toEqual(['a', 'b']));
    it('"[true,false]" → [true,false]', () =>
      expect(converted(toArray('[true,false]'))).toEqual([true, false]));
    it('"[null,null]" → [null,null]', () =>
      expect(converted(toArray('[null,null]'))).toEqual([null, null]));
    it('\'[{"a":1}]\' → [{a:1}]', () =>
      expect(converted(toArray('[{"a":1}]'))).toEqual([{ a: 1 }]));
    it('"[[1,2],[3,4]]" → nested', () =>
      expect(converted(toArray('[[1,2],[3,4]]'))).toEqual([
        [1, 2],
        [3, 4],
      ]));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('invalid strings → { ok: false, error }', () => {
    it('"hello" → { ok: false, error }', () =>
      expectNotConvertible(toArray('hello'), ConvertMessages.ARRAY));
    it('"" → { ok: false, error }', () => expectNotConvertible(toArray(''), ConvertMessages.ARRAY));
    it('"null" → { ok: false, error }', () =>
      expectNotConvertible(toArray('null'), ConvertMessages.ARRAY));
    it('"true" → { ok: false, error }', () =>
      expectNotConvertible(toArray('true'), ConvertMessages.ARRAY));
    it('"42" → { ok: false, error }', () =>
      expectNotConvertible(toArray('42'), ConvertMessages.ARRAY));
    it('"{}" → { ok: false, error }', () =>
      expectNotConvertible(toArray('{}'), ConvertMessages.ARRAY));
    it('"[1,2,]" → { ok: false, error }', () =>
      expectNotConvertible(toArray('[1,2,]'), ConvertMessages.ARRAY));
    it('" hello " → { ok: false, error }', () =>
      expectNotConvertible(toArray(' hello '), ConvertMessages.ARRAY));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toArray(null), ConvertMessages.ARRAY));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toArray(undefined), ConvertMessages.ARRAY));
  });

  describe('numbers → { ok: false, error }', () => {
    it('42 → { ok: false, error }', () => expectNotConvertible(toArray(42), ConvertMessages.ARRAY));
    it('0 → { ok: false, error }', () => expectNotConvertible(toArray(0), ConvertMessages.ARRAY));
    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toArray(NaN), ConvertMessages.ARRAY));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toArray(true), ConvertMessages.ARRAY));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toArray(false), ConvertMessages.ARRAY));
  });

  describe('plain objects → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toArray({}), ConvertMessages.ARRAY));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toArray({ a: 1 }), ConvertMessages.ARRAY));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toArray(() => [1, 2]),
        ConvertMessages.ARRAY,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toArray(function getItems() {}),
        ConvertMessages.ARRAY,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toArray(Symbol('x')), ConvertMessages.ARRAY));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toArray(Symbol()), ConvertMessages.ARRAY));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toArray(BigInt(1)), ConvertMessages.ARRAY));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Map()), ConvertMessages.ARRAY));
    it('new Set([1,2]) → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Set([1, 2])), ConvertMessages.ARRAY));
    it('new Date() → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Date()), ConvertMessages.ARRAY));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Error('x')), ConvertMessages.ARRAY));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Promise(() => {})), ConvertMessages.ARRAY));
    it('new Uint8Array([1,2,3]) → { ok: false, error }', () =>
      expectNotConvertible(toArray(new Uint8Array([1, 2, 3])), ConvertMessages.ARRAY));
    it('generator object → { ok: false, error }', () => {
      function* gen() {
        yield 1;
        yield 2;
      }
      expectNotConvertible(toArray(gen()), ConvertMessages.ARRAY);
    });
  });
});

describe('convert rules — { ok, value, error }', () => {
  describe('toJson / toArray — single JSON.parse', () => {
    it('toArray', () => {
      expect(value(toArray('[1,2]'))).toEqual([1, 2]);
      expect(toArray('{"a":1}')).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
      expect(toArray('[')).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
      expect(toArray(1)).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
    });
  });
});
