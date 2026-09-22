import { describe, expect, it } from '@jest/globals';
import { toFloat, ConvertError } from '../../src/convert';

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

describe('toFloat', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('finite number → same value', () => {
    it('0 → 0', () => expect(toFloat(0)).toBe(0));
    it('-0 → -0', () => expect(Object.is(toFloat(-0), -0)).toBe(true));
    it('3.14 → 3.14', () => expect(toFloat(3.14)).toBe(3.14));
    it('42 → 42', () => expect(toFloat(42)).toBe(42));
    it('Number.MAX_VALUE → same', () => expect(toFloat(Number.MAX_VALUE)).toBe(Number.MAX_VALUE));
    it('Number.EPSILON → same', () => expect(toFloat(Number.EPSILON)).toBe(Number.EPSILON));
  });

  describe('string → parsed float', () => {
    it('"3.14" → 3.14', () => expect(toFloat('3.14')).toBe(3.14));
    it('"42" → 42', () => expect(toFloat('42')).toBe(42));
    it('"  -1.5  " → -1.5 (trims)', () => expect(toFloat('  -1.5  ')).toBe(-1.5));
    it('".5" → 0.5 (leading dot)', () => expect(toFloat('.5')).toBe(0.5));
    it('"5." → 5 (trailing dot)', () => expect(toFloat('5.')).toBe(5));
    it('"+3.14" → 3.14', () => expect(toFloat('+3.14')).toBe(3.14));
    it('"1e5" → 100000', () => expect(toFloat('1e5')).toBe(100000));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-finite numbers — message shows the numeric value', () => {
    it('NaN → "Cannot convert NaN to float"', () =>
      expectConvertError(() => toFloat(NaN), 'Cannot convert NaN to float'));
    it('Infinity → "Cannot convert Infinity to float"', () =>
      expectConvertError(() => toFloat(Infinity), 'Cannot convert Infinity to float'));
    it('-Infinity → "Cannot convert -Infinity to float"', () =>
      expectConvertError(() => toFloat(-Infinity), 'Cannot convert -Infinity to float'));
  });

  describe('empty / whitespace strings — message quotes the ORIGINAL string (not trimmed)', () => {
    it('"" → \'Cannot convert "" to float\'', () =>
      expectConvertError(() => toFloat(''), 'Cannot convert "" to float'));
    it('" " → \'Cannot convert " " to float\' (original string, not trimmed)', () =>
      expectConvertError(() => toFloat(' '), 'Cannot convert " " to float'));
    it('"   " → \'Cannot convert "   " to float\'', () =>
      expectConvertError(() => toFloat('   '), 'Cannot convert "   " to float'));
  });

  describe('non-numeric strings — message quotes the ORIGINAL string (not trimmed)', () => {
    it('"hello" → \'Cannot convert "hello" to float\'', () =>
      expectConvertError(() => toFloat('hello'), 'Cannot convert "hello" to float'));
    it('"Infinity" → \'Cannot convert "Infinity" to float\'', () =>
      expectConvertError(() => toFloat('Infinity'), 'Cannot convert "Infinity" to float'));
    it('"NaN" → \'Cannot convert "NaN" to float\'', () =>
      expectConvertError(() => toFloat('NaN'), 'Cannot convert "NaN" to float'));
    it('" hello " → spaces preserved in message', () =>
      expectConvertError(() => toFloat(' hello '), 'Cannot convert " hello " to float'));
    it('"1,234" → \'Cannot convert "1,234" to float\'', () =>
      expectConvertError(() => toFloat('1,234'), 'Cannot convert "1,234" to float'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to float"  (NOT "object")', () =>
      expectConvertError(() => toFloat(null), 'Cannot convert null to float'));
    it('undefined → "Cannot convert undefined to float"', () =>
      expectConvertError(() => toFloat(undefined), 'Cannot convert undefined to float'));
  });

  describe('booleans — show the value', () => {
    it('true → "Cannot convert true to float"  (NOT "boolean")', () =>
      expectConvertError(() => toFloat(true), 'Cannot convert true to float'));
    it('false → "Cannot convert false to float"', () =>
      expectConvertError(() => toFloat(false), 'Cannot convert false to float'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to float"', () =>
      expectConvertError(() => toFloat({}), 'Cannot convert {} to float'));
    it('{ a: 1 } → \'Cannot convert {"a":1} to float\'', () =>
      expectConvertError(() => toFloat({ a: 1 }), 'Cannot convert {"a":1} to float'));
    it('[] → "Cannot convert [] to float"', () =>
      expectConvertError(() => toFloat([]), 'Cannot convert [] to float'));
  });

  describe('functions — show [Function] or [Function: name]', () => {
    it('arrow fn → "Cannot convert [Function] to float"', () =>
      expectConvertError(() => toFloat(() => 3.14), 'Cannot convert [Function] to float'));
    it('named fn → "Cannot convert [Function: calc] to float"', () =>
      expectConvertError(
        () => toFloat(function calc() {}),
        'Cannot convert [Function: calc] to float',
      ));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("pi") → "Cannot convert Symbol(pi) to float"  (NOT "symbol")', () =>
      expectConvertError(() => toFloat(Symbol('pi')), 'Cannot convert Symbol(pi) to float'));
    it('Symbol() → "Cannot convert Symbol() to float"', () =>
      expectConvertError(() => toFloat(Symbol()), 'Cannot convert Symbol() to float'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to float"  (NOT "bigint")', () =>
      expectConvertError(() => toFloat(BigInt(1)), 'Cannot convert BigInt(1) to float'));
    it('BigInt(0) → "Cannot convert BigInt(0) to float"', () =>
      expectConvertError(() => toFloat(BigInt(0)), 'Cannot convert BigInt(0) to float'));
  });

  describe('well-known objects — show type name in brackets', () => {
    it('new Map() → "Cannot convert [Map] to float"  (NOT "object")', () =>
      expectConvertError(() => toFloat(new Map()), 'Cannot convert [Map] to float'));
    it('new Set() → "Cannot convert [Set] to float"', () =>
      expectConvertError(() => toFloat(new Set()), 'Cannot convert [Set] to float'));
    it('new Date() → "Cannot convert [Date] to float"', () =>
      expectConvertError(() => toFloat(new Date()), 'Cannot convert [Date] to float'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to float"', () =>
      expectConvertError(
        () => toFloat(new Promise(() => {})),
        'Cannot convert [Promise] to float',
      ));
    it('new Uint8Array() → "Cannot convert [Uint8Array] to float"', () =>
      expectConvertError(() => toFloat(new Uint8Array()), 'Cannot convert [Uint8Array] to float'));
    it('new Error("x") → "Cannot convert [Error] to float"', () =>
      expectConvertError(() => toFloat(new Error('x')), 'Cannot convert [Error] to float'));
  });
});
