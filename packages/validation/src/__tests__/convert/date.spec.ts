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

  describe('out-of-range date strings — throw even when V8 silently rolls over', () => {
    // months with 30 days: April(4), June(6), September(9), November(11)
    it('"2024-04-31" → ConvertError (April has 30 days)', () =>
      expectConvertError(() => toDate('2024-04-31'), 'Cannot convert "2024-04-31" to date'));
    it('"2024-06-31" → ConvertError (June has 30 days)', () =>
      expectConvertError(() => toDate('2024-06-31'), 'Cannot convert "2024-06-31" to date'));
    it('"2024-09-31" → ConvertError (September has 30 days)', () =>
      expectConvertError(() => toDate('2024-09-31'), 'Cannot convert "2024-09-31" to date'));
    it('"2024-11-31" → ConvertError (November has 30 days)', () =>
      expectConvertError(() => toDate('2024-11-31'), 'Cannot convert "2024-11-31" to date'));

    // February edge cases
    it('"2023-02-29" → ConvertError (2023 is not a leap year)', () =>
      expectConvertError(() => toDate('2023-02-29'), 'Cannot convert "2023-02-29" to date'));
    it('"2100-02-29" → ConvertError (2100 is not a leap year — divisible by 100, not 400)', () =>
      expectConvertError(() => toDate('2100-02-29'), 'Cannot convert "2100-02-29" to date'));
    it('"2024-02-30" → ConvertError (February never has 30 days)', () =>
      expectConvertError(() => toDate('2024-02-30'), 'Cannot convert "2024-02-30" to date'));
    it('"2024-02-29" → valid (2024 IS a leap year)', () => {
      const d = toDate('2024-02-29');
      expect(d.getUTCDate()).toBe(29);
      expect(d.getUTCMonth()).toBe(1);
    });

    // time overflow
    it('"2024-03-23T24:00:00" → ConvertError (hour 24 not valid)', () =>
      expectConvertError(
        () => toDate('2024-03-23T24:00:00'),
        'Cannot convert "2024-03-23T24:00:00" to date',
      ));
    it('"2024-03-23T00:60:00" → ConvertError (minute 60)', () =>
      expectConvertError(
        () => toDate('2024-03-23T00:60:00'),
        'Cannot convert "2024-03-23T00:60:00" to date',
      ));
    it('"2024-03-23T00:00:60" → ConvertError (second 60)', () =>
      expectConvertError(
        () => toDate('2024-03-23T00:00:60'),
        'Cannot convert "2024-03-23T00:00:60" to date',
      ));

    // day/month lower-bound overflow
    it('"2024-01-00" → ConvertError (day 0)', () =>
      expectConvertError(() => toDate('2024-01-00'), 'Cannot convert "2024-01-00" to date'));
    it('"2024-00-15" → ConvertError (month 0)', () =>
      expectConvertError(() => toDate('2024-00-15'), 'Cannot convert "2024-00-15" to date'));
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
