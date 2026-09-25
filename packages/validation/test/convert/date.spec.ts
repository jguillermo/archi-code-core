import { describe, expect, it } from '@jest/globals';
import { toDate, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

describe('toDate', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('Date instance → same instance returned', () => {
    it('valid Date → same reference', () => {
      const d = new Date('2024-01-15');
      expect(converted(toDate(d))).toBe(d);
    });
    it('epoch (1970-01-01T00:00:00.000Z) → getTime() === 0', () =>
      expect(converted(toDate(new Date('1970-01-01T00:00:00.000Z'))).getTime()).toBe(0));
    it('subclass of Date → valid (instanceof passes)', () => {
      class MyDate extends Date {}
      expect(converted(toDate(new MyDate('2024-06-15')))).toBeInstanceOf(Date);
    });
  });

  describe('valid ISO 8601 string → Date ({ iso: true } for date-times)', () => {
    it('"2024-01-15" → Jan 15 2024 UTC', () => {
      const d = converted(toDate('2024-01-15'));
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(15);
    });
    it('"1970-01-01T00:00:00.000Z" → epoch', () =>
      expect(converted(toDate('1970-01-01T00:00:00.000Z', { iso: true })).getTime()).toBe(0));
    it('"2024-06-15T12:30:00Z" → hours 12, minutes 30', () => {
      const d = converted(toDate('2024-06-15T12:30:00Z', { iso: true }));
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(30);
    });
    it('"2024-02-29" → valid leap year', () => {
      const d = converted(toDate('2024-02-29'));
      expect(d.getUTCDate()).toBe(29);
    });
  });

  describe('out-of-range date strings — rejected even when V8 silently rolls over', () => {
    // months with 30 days: April(4), June(6), September(9), November(11)
    it('"2024-04-31" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-04-31'), ConvertMessages.DATE));
    it('"2024-06-31" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-06-31'), ConvertMessages.DATE));
    it('"2024-09-31" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-09-31'), ConvertMessages.DATE));
    it('"2024-11-31" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-11-31'), ConvertMessages.DATE));

    // February edge cases
    it('"2023-02-29" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2023-02-29'), ConvertMessages.DATE));
    it('"2100-02-29" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2100-02-29'), ConvertMessages.DATE));
    it('"2024-02-30" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-02-30'), ConvertMessages.DATE));
    it('"2024-02-29" → valid (2024 IS a leap year)', () => {
      const d = converted(toDate('2024-02-29'));
      expect(d.getUTCDate()).toBe(29);
      expect(d.getUTCMonth()).toBe(1);
    });

    // time overflow
    it('"2024-03-23T24:00:00" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-03-23T24:00:00'), ConvertMessages.DATE));
    it('"2024-03-23T00:60:00" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-03-23T00:60:00'), ConvertMessages.DATE));
    it('"2024-03-23T00:00:60" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-03-23T00:00:60'), ConvertMessages.DATE));

    // day/month lower-bound overflow
    it('"2024-01-00" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-01-00'), ConvertMessages.DATE));
    it('"2024-00-15" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-00-15'), ConvertMessages.DATE));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('invalid Date instance → { ok: false, error }', () => {
    it('new Date("invalid") → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Date('invalid')), ConvertMessages.DATE));
    it('new Date("") → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Date('')), ConvertMessages.DATE));
  });

  describe('invalid date strings → { ok: false, error }', () => {
    it('"not-a-date" → { ok: false, error }', () =>
      expectNotConvertible(toDate('not-a-date'), ConvertMessages.DATE));
    it('"" → { ok: false, error }', () => expectNotConvertible(toDate(''), ConvertMessages.DATE));
    it('" " → { ok: false, error }', () => expectNotConvertible(toDate(' '), ConvertMessages.DATE));
    it('"2024-13-01" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-13-01'), ConvertMessages.DATE));
    it('"2024-00-01" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-00-01'), ConvertMessages.DATE));
    it('"2024-01-32" → { ok: false, error }', () =>
      expectNotConvertible(toDate('2024-01-32'), ConvertMessages.DATE));
    it('"abc" → { ok: false, error }', () =>
      expectNotConvertible(toDate('abc'), ConvertMessages.DATE));
    it('"31/12/2024" → { ok: false, error }', () =>
      expectNotConvertible(toDate('31/12/2024'), ConvertMessages.DATE));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toDate(null), ConvertMessages.DATE));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toDate(undefined), ConvertMessages.DATE));
  });

  describe('numbers → { ok: false, error }', () => {
    it('0 → { ok: false, error }', () => expectNotConvertible(toDate(0), ConvertMessages.DATE));
    it('1705276800000 → { ok: false, error }', () =>
      expectNotConvertible(toDate(1705276800000), ConvertMessages.DATE));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toDate(true), ConvertMessages.DATE));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toDate(false), ConvertMessages.DATE));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toDate({}), ConvertMessages.DATE));
    it('[] → { ok: false, error }', () => expectNotConvertible(toDate([]), ConvertMessages.DATE));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toDate(() => new Date()),
        ConvertMessages.DATE,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("date") → { ok: false, error }', () =>
      expectNotConvertible(toDate(Symbol('date')), ConvertMessages.DATE));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toDate(Symbol()), ConvertMessages.DATE));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toDate(BigInt(1)), ConvertMessages.DATE));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Map()), ConvertMessages.DATE));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Set()), ConvertMessages.DATE));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Promise(() => {})), ConvertMessages.DATE));
    it('new Uint8Array() → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Uint8Array()), ConvertMessages.DATE));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toDate(new Error('x')), ConvertMessages.DATE));
  });

  describe('default rule = logic ported from isDate (format YYYY/MM/DD, delimiters / and -)', () => {
    it('"2024/01/31" and "2024-01-31" → that day at 00:00 UTC', () => {
      expect(converted(toDate('2024/01/31')).toISOString()).toBe('2024-01-31T00:00:00.000Z');
      expect(converted(toDate('2024-01-31')).toISOString()).toBe('2024-01-31T00:00:00.000Z');
    });
    it('date-times need { iso: true }', () => {
      expectNotConvertible(toDate('2024-01-31T10:00:00'), ConvertMessages.DATE);
      expect(converted(toDate('2024-01-31T10:00:00', { iso: true })).toISOString()).toBe(
        '2024-01-31T10:00:00.000Z',
      );
    });
    it('custom format and strictMode', () => {
      expect(converted(toDate('31-01-2024', { format: 'DD-MM-YYYY' })).getUTCDate()).toBe(31);
      expectNotConvertible(toDate('2024-01-31', { strictMode: true }), ConvertMessages.DATE);
      expectNotConvertible(toDate(new Date(0), { strictMode: true }), ConvertMessages.DATE);
    });
  });
});
