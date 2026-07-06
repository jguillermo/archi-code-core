import { describe, expect, it } from '@jest/globals';
import { toJson, ConvertError } from '../../src/convert';

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

describe('toJson', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('object with at least one key → same reference', () => {
    it('{ name, age } → same reference', () => {
      const o = { name: 'Alice', age: 30 };
      expect(toJson(o)).toBe(o);
    });
    it('single-key { a: 1 } → same reference', () => {
      const o = { a: 1 };
      expect(toJson(o)).toBe(o);
    });
    it('class instance with own enumerable props → returned as-is', () => {
      class Person {
        constructor(public name: string) {}
      }
      const p = new Person('Bob');
      expect(toJson(p)).toBe(p as unknown as Record<string, unknown>);
    });
    it('non-empty Uint8Array → valid (numeric indices are own enumerable keys)', () =>
      expect(() => toJson(new Uint8Array([1, 2]))).not.toThrow());
  });

  describe('JSON string of non-empty object → parsed', () => {
    it('\'{"name":"Alice"}\' → { name: "Alice" }', () =>
      expect(toJson('{"name":"Alice"}')).toEqual({ name: 'Alice' }));
    it('nested JSON string → parsed', () =>
      expect(toJson('{"a":{"b":1}}')).toEqual({ a: { b: 1 } }));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-object string input → message quotes the ORIGINAL string (not generic "string")', () => {
    it('"hello" → \'Cannot convert "hello" to JSON object\'', () =>
      expectConvertError(() => toJson('hello'), 'Cannot convert "hello" to JSON object'));
    it('"" → \'Cannot convert "" to JSON object\'', () =>
      expectConvertError(() => toJson(''), 'Cannot convert "" to JSON object'));
    it('"null" → \'Cannot convert "null" to JSON object\'', () =>
      expectConvertError(() => toJson('null'), 'Cannot convert "null" to JSON object'));
    it('"true" → \'Cannot convert "true" to JSON object\'', () =>
      expectConvertError(() => toJson('true'), 'Cannot convert "true" to JSON object'));
    it('"42" → \'Cannot convert "42" to JSON object\'', () =>
      expectConvertError(() => toJson('42'), 'Cannot convert "42" to JSON object'));
    it('"{}" → \'Cannot convert "{}" to JSON object\' (empty object)', () =>
      expectConvertError(() => toJson('{}'), 'Cannot convert "{}" to JSON object'));
    it('"[]" → \'Cannot convert "[]" to JSON object\' (array)', () =>
      expectConvertError(() => toJson('[]'), 'Cannot convert "[]" to JSON object'));
  });

  describe('null → "Cannot convert null to JSON object"  (special case)', () => {
    it('null → "Cannot convert null to JSON object"', () =>
      expectConvertError(() => toJson(null), 'Cannot convert null to JSON object'));
  });

  describe('null and undefined', () => {
    it('undefined → "Cannot convert undefined to JSON object"', () =>
      expectConvertError(() => toJson(undefined), 'Cannot convert undefined to JSON object'));
  });

  describe('numbers — show the value  (NOT "number")', () => {
    it('42 → "Cannot convert 42 to JSON object"', () =>
      expectConvertError(() => toJson(42), 'Cannot convert 42 to JSON object'));
    it('0 → "Cannot convert 0 to JSON object"', () =>
      expectConvertError(() => toJson(0), 'Cannot convert 0 to JSON object'));
    it('NaN → "Cannot convert NaN to JSON object"', () =>
      expectConvertError(() => toJson(NaN), 'Cannot convert NaN to JSON object'));
  });

  describe('booleans — show the value', () => {
    it('true → "Cannot convert true to JSON object"  (NOT "boolean")', () =>
      expectConvertError(() => toJson(true), 'Cannot convert true to JSON object'));
    it('false → "Cannot convert false to JSON object"', () =>
      expectConvertError(() => toJson(false), 'Cannot convert false to JSON object'));
  });

  describe('empty object / arrays / objects-with-no-keys → show JSON value', () => {
    it('{} → "Cannot convert {} to JSON object" (empty, 0 keys)', () =>
      expectConvertError(() => toJson({}), 'Cannot convert {} to JSON object'));
    it('[] → "Cannot convert [] to JSON object"', () =>
      expectConvertError(() => toJson([]), 'Cannot convert [] to JSON object'));
    it('[1,2,3] → "Cannot convert [1,2,3] to JSON object"', () =>
      expectConvertError(() => toJson([1, 2, 3]), 'Cannot convert [1,2,3] to JSON object'));
  });

  describe('functions — show [Function]', () => {
    it('arrow fn → "Cannot convert [Function] to JSON object"', () =>
      expectConvertError(() => toJson(() => ({})), 'Cannot convert [Function] to JSON object'));
    it('named fn → "Cannot convert [Function: foo] to JSON object"', () =>
      expectConvertError(
        () => toJson(function foo() {}),
        'Cannot convert [Function: foo] to JSON object',
      ));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("x") → "Cannot convert Symbol(x) to JSON object"  (NOT "symbol")', () =>
      expectConvertError(() => toJson(Symbol('x')), 'Cannot convert Symbol(x) to JSON object'));
    it('Symbol() → "Cannot convert Symbol() to JSON object"', () =>
      expectConvertError(() => toJson(Symbol()), 'Cannot convert Symbol() to JSON object'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to JSON object"  (NOT "bigint")', () =>
      expectConvertError(() => toJson(BigInt(1)), 'Cannot convert BigInt(1) to JSON object'));
    it('BigInt(0) → "Cannot convert BigInt(0) to JSON object"', () =>
      expectConvertError(() => toJson(BigInt(0)), 'Cannot convert BigInt(0) to JSON object'));
  });

  describe('well-known objects with 0 own enumerable keys — show type name', () => {
    it('new Map() → "Cannot convert [Map] to JSON object"  (NOT "object")', () =>
      expectConvertError(() => toJson(new Map()), 'Cannot convert [Map] to JSON object'));
    it('new Map([["a",1]]) → "Cannot convert [Map] to JSON object" (entries not own props)', () =>
      expectConvertError(() => toJson(new Map([['a', 1]])), 'Cannot convert [Map] to JSON object'));
    it('new Set([1,2]) → "Cannot convert [Set] to JSON object"', () =>
      expectConvertError(() => toJson(new Set([1, 2])), 'Cannot convert [Set] to JSON object'));
    it('new Date("2024-01-01") → "Cannot convert [Date] to JSON object"', () =>
      expectConvertError(
        () => toJson(new Date('2024-01-01')),
        'Cannot convert [Date] to JSON object',
      ));
    it('new Error("x") → "Cannot convert [Error] to JSON object"', () =>
      expectConvertError(() => toJson(new Error('x')), 'Cannot convert [Error] to JSON object'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to JSON object"', () =>
      expectConvertError(
        () => toJson(new Promise(() => {})),
        'Cannot convert [Promise] to JSON object',
      ));
    it('new WeakMap() → "Cannot convert [WeakMap] to JSON object"', () =>
      expectConvertError(() => toJson(new WeakMap()), 'Cannot convert [WeakMap] to JSON object'));
  });
});
