import { describe, expect, it } from '@jest/globals';
import { toDate, ConvertError } from '../../convert';

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

describe('toDate', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('Date instance → same instance returned', () => {
    it('valid Date → same reference', () => {
      const d = new Date('2024-01-15');
      expect(toDate(d)).toBe(d);
    });
    it('epoch (1970-01-01T00:00:00.000Z) → getTime() === 0', () =>
      expect(toDate(new Date('1970-01-01T00:00:00.000Z')).getTime()).toBe(0));
    it('subclass of Date → valid (instanceof passes)', () => {
      class MyDate extends Date {}
      expect(toDate(new MyDate('2024-06-15'))).toBeInstanceOf(Date);
    });
  });

  describe('valid ISO 8601 string → Date', () => {
    it('"2024-01-15" → Jan 15 2024 UTC', () => {
      const d = toDate('2024-01-15');
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(15);
    });
    it('"1970-01-01T00:00:00.000Z" → epoch', () =>
      expect(toDate('1970-01-01T00:00:00.000Z').getTime()).toBe(0));
    it('"2024-06-15T12:30:00Z" → hours 12, minutes 30', () => {
      const d = toDate('2024-06-15T12:30:00Z');
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(30);
    });
    it('"2024-02-29" → valid leap year', () => {
      const d = toDate('2024-02-29');
      expect(d.getUTCDate()).toBe(29);
    });
  });

  describe('V8 coercion — out-of-range days roll over (do NOT throw)', () => {
    it('"2023-02-29" → V8 rolls to Mar 1 2023', () =>
      expect(isNaN(toDate('2023-02-29').getTime())).toBe(false));
    it('"2024-02-30" → V8 rolls to Mar 1 2024', () =>
      expect(isNaN(toDate('2024-02-30').getTime())).toBe(false));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('invalid Date instance — specific message that includes "Invalid Date"', () => {
    // Current message "Invalid Date object" is acceptable — it identifies what was wrong.
    // New consistent format: "Cannot convert Invalid Date to date"
    it('new Date("invalid") → "Cannot convert Invalid Date to date"', () =>
      expectConvertError(() => toDate(new Date('invalid')), 'Cannot convert Invalid Date to date'));
    it('new Date("") → "Cannot convert Invalid Date to date"', () =>
      expectConvertError(() => toDate(new Date('')), 'Cannot convert Invalid Date to date'));
  });

  describe('invalid date strings — message quotes the ORIGINAL string', () => {
    it('"not-a-date" → \'Cannot convert "not-a-date" to date\'', () =>
      expectConvertError(() => toDate('not-a-date'), 'Cannot convert "not-a-date" to date'));
    it('"" → \'Cannot convert "" to date\'', () =>
      expectConvertError(() => toDate(''), 'Cannot convert "" to date'));
    it('" " → \'Cannot convert " " to date\'', () =>
      expectConvertError(() => toDate(' '), 'Cannot convert " " to date'));
    it('"2024-13-01" → \'Cannot convert "2024-13-01" to date\' (invalid month)', () =>
      expectConvertError(() => toDate('2024-13-01'), 'Cannot convert "2024-13-01" to date'));
    it('"2024-00-01" → \'Cannot convert "2024-00-01" to date\' (month 0)', () =>
      expectConvertError(() => toDate('2024-00-01'), 'Cannot convert "2024-00-01" to date'));
    it('"2024-01-32" → \'Cannot convert "2024-01-32" to date\' (day 32)', () =>
      expectConvertError(() => toDate('2024-01-32'), 'Cannot convert "2024-01-32" to date'));
    it('"abc" → \'Cannot convert "abc" to date\'', () =>
      expectConvertError(() => toDate('abc'), 'Cannot convert "abc" to date'));
    it('"31/12/2024" → \'Cannot convert "31/12/2024" to date\'', () =>
      expectConvertError(() => toDate('31/12/2024'), 'Cannot convert "31/12/2024" to date'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to date"  (NOT "object")', () =>
      expectConvertError(() => toDate(null), 'Cannot convert null to date'));
    it('undefined → "Cannot convert undefined to date"', () =>
      expectConvertError(() => toDate(undefined), 'Cannot convert undefined to date'));
  });

  describe('numbers — show the numeric value', () => {
    it('0 → "Cannot convert 0 to date"  (NOT "number")', () =>
      expectConvertError(() => toDate(0), 'Cannot convert 0 to date'));
    it('1705276800000 → "Cannot convert 1705276800000 to date"', () =>
      expectConvertError(() => toDate(1705276800000), 'Cannot convert 1705276800000 to date'));
  });

  describe('booleans — show the value', () => {
    it('true → "Cannot convert true to date"  (NOT "boolean")', () =>
      expectConvertError(() => toDate(true), 'Cannot convert true to date'));
    it('false → "Cannot convert false to date"', () =>
      expectConvertError(() => toDate(false), 'Cannot convert false to date'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to date"', () =>
      expectConvertError(() => toDate({}), 'Cannot convert {} to date'));
    it('[] → "Cannot convert [] to date"', () =>
      expectConvertError(() => toDate([]), 'Cannot convert [] to date'));
  });

  describe('functions — show [Function]', () => {
    it('arrow fn → "Cannot convert [Function] to date"', () =>
      expectConvertError(() => toDate(() => new Date()), 'Cannot convert [Function] to date'));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("date") → "Cannot convert Symbol(date) to date"  (NOT "symbol")', () =>
      expectConvertError(() => toDate(Symbol('date')), 'Cannot convert Symbol(date) to date'));
    it('Symbol() → "Cannot convert Symbol() to date"', () =>
      expectConvertError(() => toDate(Symbol()), 'Cannot convert Symbol() to date'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to date"  (NOT "bigint")', () =>
      expectConvertError(() => toDate(BigInt(1)), 'Cannot convert BigInt(1) to date'));
  });

  describe('well-known objects — show type name in brackets', () => {
    it('new Map() → "Cannot convert [Map] to date"  (NOT "object")', () =>
      expectConvertError(() => toDate(new Map()), 'Cannot convert [Map] to date'));
    it('new Set() → "Cannot convert [Set] to date"', () =>
      expectConvertError(() => toDate(new Set()), 'Cannot convert [Set] to date'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to date"', () =>
      expectConvertError(() => toDate(new Promise(() => {})), 'Cannot convert [Promise] to date'));
    it('new Uint8Array() → "Cannot convert [Uint8Array] to date"', () =>
      expectConvertError(() => toDate(new Uint8Array()), 'Cannot convert [Uint8Array] to date'));
    it('new Error("x") → "Cannot convert [Error] to date"', () =>
      expectConvertError(() => toDate(new Error('x')), 'Cannot convert [Error] to date'));
  });
});
