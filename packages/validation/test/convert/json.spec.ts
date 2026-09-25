import { describe, expect, it } from '@jest/globals';
import { toJson, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

describe('toJson', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('object with at least one key → same reference', () => {
    it('{ name, age } → same reference', () => {
      const o = { name: 'Alice', age: 30 };
      expect(converted(toJson(o))).toBe(o);
    });
    it('single-key { a: 1 } → same reference', () => {
      const o = { a: 1 };
      expect(converted(toJson(o))).toBe(o);
    });
    it('class instance with own enumerable props → returned as-is', () => {
      class Person {
        constructor(public name: string) {}
      }
      const p = new Person('Bob');
      expect(converted(toJson(p))).toBe(p as unknown as Record<string, unknown>);
    });
    it('non-empty Uint8Array → valid (numeric indices are own enumerable keys)', () =>
      expect(() => converted(toJson(new Uint8Array([1, 2])))).not.toThrow());
  });

  describe('JSON string of non-empty object → parsed', () => {
    it('\'{"name":"Alice"}\' → { name: "Alice" }', () =>
      expect(converted(toJson('{"name":"Alice"}'))).toEqual({ name: 'Alice' }));
    it('nested JSON string → parsed', () =>
      expect(converted(toJson('{"a":{"b":1}}'))).toEqual({ a: { b: 1 } }));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-object string input → { ok: false, error }', () => {
    it('"hello" → { ok: false, error }', () =>
      expectNotConvertible(toJson('hello'), ConvertMessages.JSON));
    it('"" → { ok: false, error }', () => expectNotConvertible(toJson(''), ConvertMessages.JSON));
    it('"null" → { ok: false, error }', () =>
      expectNotConvertible(toJson('null'), ConvertMessages.JSON));
    it('"true" → { ok: false, error }', () =>
      expectNotConvertible(toJson('true'), ConvertMessages.JSON));
    it('"42" → { ok: false, error }', () =>
      expectNotConvertible(toJson('42'), ConvertMessages.JSON));
    it('"{}" → { ok: false, error }', () =>
      expectNotConvertible(toJson('{}'), ConvertMessages.JSON));
    it('"[]" → { ok: false, error }', () =>
      expectNotConvertible(toJson('[]'), ConvertMessages.JSON));
  });

  describe('null → { ok: false, error }', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toJson(null), ConvertMessages.JSON));
  });

  describe('null and undefined', () => {
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toJson(undefined), ConvertMessages.JSON));
  });

  describe('numbers → { ok: false, error }', () => {
    it('42 → { ok: false, error }', () => expectNotConvertible(toJson(42), ConvertMessages.JSON));
    it('0 → { ok: false, error }', () => expectNotConvertible(toJson(0), ConvertMessages.JSON));
    it('NaN → { ok: false, error }', () => expectNotConvertible(toJson(NaN), ConvertMessages.JSON));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toJson(true), ConvertMessages.JSON));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toJson(false), ConvertMessages.JSON));
  });

  describe('empty object / arrays / objects-with-no-keys → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toJson({}), ConvertMessages.JSON));
    it('[] → { ok: false, error }', () => expectNotConvertible(toJson([]), ConvertMessages.JSON));
    it('[1,2,3] → { ok: false, error }', () =>
      expectNotConvertible(toJson([1, 2, 3]), ConvertMessages.JSON));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toJson(() => ({})),
        ConvertMessages.JSON,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toJson(function foo() {}),
        ConvertMessages.JSON,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toJson(Symbol('x')), ConvertMessages.JSON));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toJson(Symbol()), ConvertMessages.JSON));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toJson(BigInt(1)), ConvertMessages.JSON));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toJson(BigInt(0)), ConvertMessages.JSON));
  });

  describe('well-known objects with 0 own enumerable keys → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Map()), ConvertMessages.JSON));
    it('new Map([["a",1]]) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Map([['a', 1]])), ConvertMessages.JSON));
    it('new Set([1,2]) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Set([1, 2])), ConvertMessages.JSON));
    it('new Date("2024-01-01") → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Date('2024-01-01')), ConvertMessages.JSON));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Error('x')), ConvertMessages.JSON));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Promise(() => {})), ConvertMessages.JSON));
    it('new WeakMap() → { ok: false, error }', () =>
      expectNotConvertible(toJson(new WeakMap()), ConvertMessages.JSON));
  });
});
