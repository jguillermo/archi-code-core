import { describe, expect, it } from '@jest/globals';
import { toBoolean, ConvertError } from '../../src/convert';

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

describe('toBoolean', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('boolean → same value', () => {
    it('true → true', () => expect(toBoolean(true)).toBe(true));
    it('false → false', () => expect(toBoolean(false)).toBe(false));
  });

  describe('number → boolean (only 1 and 0)', () => {
    it('1 → true', () => expect(toBoolean(1)).toBe(true));
    it('0 → false', () => expect(toBoolean(0)).toBe(false));
    it('-0 → false (-0 === 0)', () => expect(toBoolean(-0)).toBe(false));
  });

  describe('string → boolean (case-insensitive, trims whitespace)', () => {
    it.each(['true', 'TRUE', 'True', 'tRuE', '  true  ', '1', '  1  '])('"%s" → true', (s) =>
      expect(toBoolean(s)).toBe(true));
    it.each(['false', 'FALSE', 'False', 'fAlSe', '  false  ', '0', '  0  '])('"%s" → false', (s) =>
      expect(toBoolean(s)).toBe(false));
  });

  // ─── error cases ──────────────────────────────────────────────────────────
  //
  // Rule: EVERY message must show the ACTUAL VALUE that was passed,
  // never a lossy representation.
  //
  // Key fixes vs current implementation:
  //   NaN      → "Cannot convert NaN to boolean"      (NOT "null" — JSON.stringify(NaN) = "null" is a bug)
  //   Infinity → "Cannot convert Infinity to boolean" (NOT "null")
  //  -Infinity → "Cannot convert -Infinity to boolean" (NOT "null")
  //   fn()     → "Cannot convert [Function] to boolean" (NOT "undefined")
  //   Symbol   → "Cannot convert Symbol(x) to boolean" (NOT "undefined")
  //   BigInt   → "Cannot convert BigInt(n) to boolean"
  //   null     → "Cannot convert null to boolean"      (NOT "null" from JSON.stringify — coincidentally same but via correct path)

  describe('numbers that are not 0 or 1 — show the numeric value', () => {
    it('2 → "Cannot convert 2 to boolean"', () =>
      expectConvertError(() => toBoolean(2), 'Cannot convert 2 to boolean'));
    it('-1 → "Cannot convert -1 to boolean"', () =>
      expectConvertError(() => toBoolean(-1), 'Cannot convert -1 to boolean'));
    it('0.5 → "Cannot convert 0.5 to boolean"', () =>
      expectConvertError(() => toBoolean(0.5), 'Cannot convert 0.5 to boolean'));

    // These are the critical fixes: current impl says "null" (JSON.stringify quirk)
    it('NaN → "Cannot convert NaN to boolean"  ⚠ currently says "null"', () =>
      expectConvertError(() => toBoolean(NaN), 'Cannot convert NaN to boolean'));
    it('Infinity → "Cannot convert Infinity to boolean"  ⚠ currently says "null"', () =>
      expectConvertError(() => toBoolean(Infinity), 'Cannot convert Infinity to boolean'));
    it('-Infinity → "Cannot convert -Infinity to boolean"  ⚠ currently says "null"', () =>
      expectConvertError(() => toBoolean(-Infinity), 'Cannot convert -Infinity to boolean'));
  });

  describe('strings that are not true/false/0/1 — show the string value (quoted)', () => {
    it('"maybe" → \'Cannot convert "maybe" to boolean\'', () =>
      expectConvertError(() => toBoolean('maybe'), 'Cannot convert "maybe" to boolean'));
    it('"yes" → \'Cannot convert "yes" to boolean\'', () =>
      expectConvertError(() => toBoolean('yes'), 'Cannot convert "yes" to boolean'));
    it('"" → \'Cannot convert "" to boolean\'', () =>
      expectConvertError(() => toBoolean(''), 'Cannot convert "" to boolean'));
    it('" " → \'Cannot convert " " to boolean\'', () =>
      expectConvertError(() => toBoolean(' '), 'Cannot convert " " to boolean'));
    it('"2" → \'Cannot convert "2" to boolean\'', () =>
      expectConvertError(() => toBoolean('2'), 'Cannot convert "2" to boolean'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to boolean"', () =>
      expectConvertError(() => toBoolean(null), 'Cannot convert null to boolean'));
    it('undefined → "Cannot convert undefined to boolean"', () =>
      expectConvertError(() => toBoolean(undefined), 'Cannot convert undefined to boolean'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to boolean"', () =>
      expectConvertError(() => toBoolean({}), 'Cannot convert {} to boolean'));
    it('{ a: 1 } → \'Cannot convert {"a":1} to boolean\'', () =>
      expectConvertError(() => toBoolean({ a: 1 }), 'Cannot convert {"a":1} to boolean'));
    it('[] → "Cannot convert [] to boolean"', () =>
      expectConvertError(() => toBoolean([]), 'Cannot convert [] to boolean'));
    it('[true] → "Cannot convert [true] to boolean"', () =>
      expectConvertError(() => toBoolean([true]), 'Cannot convert [true] to boolean'));
  });

  describe('functions — show [Function]  ⚠ currently says "undefined" (JSON.stringify(fn) = undefined)', () => {
    it('arrow fn → "Cannot convert [Function] to boolean"', () =>
      expectConvertError(() => toBoolean(() => {}), 'Cannot convert [Function] to boolean'));
    it('async fn → "Cannot convert [Function] to boolean"', () =>
      expectConvertError(() => toBoolean(async () => {}), 'Cannot convert [Function] to boolean'));
    it('named fn → "Cannot convert [Function: foo] to boolean"', () =>
      expectConvertError(() => toBoolean(function foo() {}), 'Cannot convert [Function: foo] to boolean'));
  });

  describe('Symbol — show Symbol(description)  ⚠ currently says "undefined"', () => {
    it('Symbol("x") → "Cannot convert Symbol(x) to boolean"', () =>
      expectConvertError(() => toBoolean(Symbol('x')), 'Cannot convert Symbol(x) to boolean'));
    it('Symbol() → "Cannot convert Symbol() to boolean"', () =>
      expectConvertError(() => toBoolean(Symbol()), 'Cannot convert Symbol() to boolean'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(0) → "Cannot convert BigInt(0) to boolean"', () =>
      expectConvertError(() => toBoolean(BigInt(0)), 'Cannot convert BigInt(0) to boolean'));
    it('BigInt(1) → "Cannot convert BigInt(1) to boolean"', () =>
      expectConvertError(() => toBoolean(BigInt(1)), 'Cannot convert BigInt(1) to boolean'));
  });

  describe('well-known objects — show type name in brackets', () => {
    it('new Map() → "Cannot convert [Map] to boolean"  (NOT "{}")', () =>
      expectConvertError(() => toBoolean(new Map()), 'Cannot convert [Map] to boolean'));
    it('new Set() → "Cannot convert [Set] to boolean"  (NOT "{}")', () =>
      expectConvertError(() => toBoolean(new Set()), 'Cannot convert [Set] to boolean'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to boolean"  (NOT "{}")', () =>
      expectConvertError(() => toBoolean(new Promise(() => {})), 'Cannot convert [Promise] to boolean'));
    it('/regex/ → "Cannot convert /regex/ to boolean"  (NOT "{}")', () =>
      expectConvertError(() => toBoolean(/regex/), 'Cannot convert /regex/ to boolean'));
    it('new Error("x") → "Cannot convert [Error] to boolean"', () =>
      expectConvertError(() => toBoolean(new Error('x')), 'Cannot convert [Error] to boolean'));
    it('new Date("2024-01-01") → "Cannot convert [Date] to boolean"', () =>
      expectConvertError(() => toBoolean(new Date('2024-01-01')), 'Cannot convert [Date] to boolean'));
  });
});
