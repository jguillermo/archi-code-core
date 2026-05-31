import { describe, expect, it } from '@jest/globals';
import { toInteger, ConvertError } from '../../convert';

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

describe('toInteger', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('integer number → same value', () => {
    it('0 → 0', () => expect(toInteger(0)).toBe(0));
    it('42 → 42', () => expect(toInteger(42)).toBe(42));
    it('-7 → -7', () => expect(toInteger(-7)).toBe(-7));
    it('1.0 → 1 (integer-valued float)', () => expect(toInteger(1.0)).toBe(1));
    it('Number.MAX_SAFE_INTEGER → same', () => expect(toInteger(Number.MAX_SAFE_INTEGER)).toBe(9007199254740991));
    it('Number.MIN_SAFE_INTEGER → same', () => expect(toInteger(Number.MIN_SAFE_INTEGER)).toBe(-9007199254740991));
  });

  describe('string → parsed integer', () => {
    it('"42" → 42', () => expect(toInteger('42')).toBe(42));
    it('"-7" → -7', () => expect(toInteger('-7')).toBe(-7));
    it('"0" → 0', () => expect(toInteger('0')).toBe(0));
    it('"  10  " → 10 (trimmed)', () => expect(toInteger('  10  ')).toBe(10));
    it('"007" → 7 (decimal, not octal)', () => expect(toInteger('007')).toBe(7));
    it('"-0" → -0 (parseInt preserves -0)', () => expect(Object.is(toInteger('-0'), -0)).toBe(true));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-finite / non-integer numbers — message shows the numeric value', () => {
    it('NaN → "Cannot convert NaN to integer"', () =>
      expectConvertError(() => toInteger(NaN), 'Cannot convert NaN to integer'));
    it('Infinity → "Cannot convert Infinity to integer"', () =>
      expectConvertError(() => toInteger(Infinity), 'Cannot convert Infinity to integer'));
    it('-Infinity → "Cannot convert -Infinity to integer"', () =>
      expectConvertError(() => toInteger(-Infinity), 'Cannot convert -Infinity to integer'));
    it('3.14 → "Cannot convert 3.14 to integer"', () =>
      expectConvertError(() => toInteger(3.14), 'Cannot convert 3.14 to integer'));
    it('-3.14 → "Cannot convert -3.14 to integer"', () =>
      expectConvertError(() => toInteger(-3.14), 'Cannot convert -3.14 to integer'));
    it('0.5 → "Cannot convert 0.5 to integer"', () =>
      expectConvertError(() => toInteger(0.5), 'Cannot convert 0.5 to integer'));
  });

  describe('invalid strings — message quotes the ORIGINAL string (not trimmed)', () => {
    it('"abc" → \'Cannot convert "abc" to integer\'', () =>
      expectConvertError(() => toInteger('abc'), 'Cannot convert "abc" to integer'));
    it('"3.14" → \'Cannot convert "3.14" to integer\'', () =>
      expectConvertError(() => toInteger('3.14'), 'Cannot convert "3.14" to integer'));
    it('"" → \'Cannot convert "" to integer\'', () =>
      expectConvertError(() => toInteger(''), 'Cannot convert "" to integer'));
    it('" " → \'Cannot convert " " to integer\' (original string, not trimmed)', () =>
      expectConvertError(() => toInteger(' '), 'Cannot convert " " to integer'));
    it('"  abc  " → message includes surrounding spaces', () =>
      expectConvertError(() => toInteger('  abc  '), 'Cannot convert "  abc  " to integer'));
    it('"+42" → \'Cannot convert "+42" to integer\' (+ not allowed)', () =>
      expectConvertError(() => toInteger('+42'), 'Cannot convert "+42" to integer'));
    it('"1e5" → \'Cannot convert "1e5" to integer\' (scientific notation rejected)', () =>
      expectConvertError(() => toInteger('1e5'), 'Cannot convert "1e5" to integer'));
    it('"0xFF" → \'Cannot convert "0xFF" to integer\' (hex rejected)', () =>
      expectConvertError(() => toInteger('0xFF'), 'Cannot convert "0xFF" to integer'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to integer"  (NOT "object")', () =>
      expectConvertError(() => toInteger(null), 'Cannot convert null to integer'));
    it('undefined → "Cannot convert undefined to integer"', () =>
      expectConvertError(() => toInteger(undefined), 'Cannot convert undefined to integer'));
  });

  describe('booleans — show the value', () => {
    it('true → "Cannot convert true to integer"  (NOT "boolean")', () =>
      expectConvertError(() => toInteger(true), 'Cannot convert true to integer'));
    it('false → "Cannot convert false to integer"', () =>
      expectConvertError(() => toInteger(false), 'Cannot convert false to integer'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to integer"', () =>
      expectConvertError(() => toInteger({}), 'Cannot convert {} to integer'));
    it('{ a: 1 } → \'Cannot convert {"a":1} to integer\'', () =>
      expectConvertError(() => toInteger({ a: 1 }), 'Cannot convert {"a":1} to integer'));
    it('[] → "Cannot convert [] to integer"', () =>
      expectConvertError(() => toInteger([]), 'Cannot convert [] to integer'));
    it('[42] → "Cannot convert [42] to integer"', () =>
      expectConvertError(() => toInteger([42]), 'Cannot convert [42] to integer'));
  });

  describe('functions — show [Function] or [Function: name]', () => {
    it('arrow fn → "Cannot convert [Function] to integer"', () =>
      expectConvertError(() => toInteger(() => 42), 'Cannot convert [Function] to integer'));
    it('named fn → "Cannot convert [Function: foo] to integer"', () =>
      expectConvertError(() => toInteger(function foo() {}), 'Cannot convert [Function: foo] to integer'));
    it('async fn → "Cannot convert [Function] to integer"', () =>
      expectConvertError(() => toInteger(async () => 42), 'Cannot convert [Function] to integer'));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("x") → "Cannot convert Symbol(x) to integer"  (NOT "symbol")', () =>
      expectConvertError(() => toInteger(Symbol('x')), 'Cannot convert Symbol(x) to integer'));
    it('Symbol() → "Cannot convert Symbol() to integer"', () =>
      expectConvertError(() => toInteger(Symbol()), 'Cannot convert Symbol() to integer'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to integer"  (NOT "bigint")', () =>
      expectConvertError(() => toInteger(BigInt(1)), 'Cannot convert BigInt(1) to integer'));
    it('BigInt(0) → "Cannot convert BigInt(0) to integer"', () =>
      expectConvertError(() => toInteger(BigInt(0)), 'Cannot convert BigInt(0) to integer'));
  });

  describe('well-known objects — show type name in brackets', () => {
    it('new Map() → "Cannot convert [Map] to integer"  (NOT "object")', () =>
      expectConvertError(() => toInteger(new Map()), 'Cannot convert [Map] to integer'));
    it('new Set() → "Cannot convert [Set] to integer"', () =>
      expectConvertError(() => toInteger(new Set()), 'Cannot convert [Set] to integer'));
    it('new Date() → "Cannot convert [Date] to integer"', () =>
      expectConvertError(() => toInteger(new Date()), 'Cannot convert [Date] to integer'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to integer"', () =>
      expectConvertError(() => toInteger(new Promise(() => {})), 'Cannot convert [Promise] to integer'));
    it('new Uint8Array() → "Cannot convert [Uint8Array] to integer"', () =>
      expectConvertError(() => toInteger(new Uint8Array()), 'Cannot convert [Uint8Array] to integer'));
    it('new Error("x") → "Cannot convert [Error] to integer"', () =>
      expectConvertError(() => toInteger(new Error('x')), 'Cannot convert [Error] to integer'));
  });
});
