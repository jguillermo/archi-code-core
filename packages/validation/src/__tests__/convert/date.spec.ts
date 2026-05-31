import { describe, expect, it } from '@jest/globals';
import { toDate, ConvertError } from '../../convert';

describe('toDate', () => {
  describe('Date instance → Date (identity)', () => {
    it('valid Date instance → same Date', () => {
      const d = new Date('2024-01-15');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('epoch Date (1970-01-01) → same Date', () => {
      const d = new Date('1970-01-01');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('future Date (9999-12-31) → same Date', () => {
      const d = new Date('9999-12-31');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('Date with time component → same Date', () => {
      const d = new Date('2024-06-15T12:30:00Z');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('Date at midnight UTC → same Date', () => {
      const d = new Date('2024-01-01T00:00:00.000Z');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
    it('Date at year 2000 → same Date', () => {
      const d = new Date('2000-01-01');
      expect(toDate(d).getTime()).toBe(d.getTime());
    });
  });

  describe('invalid Date instance throws ConvertError', () => {
    it('new Date("invalid") throws', () => expect(() => toDate(new Date('invalid'))).toThrow(ConvertError));
    it('new Date("") throws', () => expect(() => toDate(new Date(''))).toThrow(ConvertError));
    it('new Date("not-a-date") throws', () => expect(() => toDate(new Date('not-a-date'))).toThrow(ConvertError));
  });

  describe('ISO 8601 string → Date', () => {
    it('"2024-01-15" → Date with year 2024', () => {
      const d = toDate('2024-01-15');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2024);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(15);
    });
    it('"2000-01-01" → Date', () => {
      const d = toDate('2000-01-01');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(2000);
    });
    it('"1970-01-01" → epoch', () => {
      const d = toDate('1970-01-01');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCFullYear()).toBe(1970);
      expect(d.getTime()).toBe(0);
    });
    it('"1970-01-01T00:00:00.000Z" → epoch (explicit)', () => {
      expect(toDate('1970-01-01T00:00:00.000Z').getTime()).toBe(0);
    });
    it('"9999-12-31" → far future Date', () => {
      const d = toDate('9999-12-31');
      expect(d.getUTCFullYear()).toBe(9999);
    });
    it('"2024-02-29" → valid leap year date', () => {
      const d = toDate('2024-02-29');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCMonth()).toBe(1);
      expect(d.getUTCDate()).toBe(29);
    });
    it('"2024-12-31" → last day of year', () => {
      const d = toDate('2024-12-31');
      expect(d.getUTCMonth()).toBe(11);
      expect(d.getUTCDate()).toBe(31);
    });
  });

  describe('ISO 8601 string with time → Date', () => {
    it('"2024-06-15T12:30:00Z" → Date with correct hours', () => {
      const d = toDate('2024-06-15T12:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(30);
    });
    it('"2024-06-15T00:00:00.000Z" → midnight UTC', () => {
      const d = toDate('2024-06-15T00:00:00.000Z');
      expect(d.getUTCHours()).toBe(0);
    });
    it('"2024-06-15T23:59:59.999Z" → end of day', () => {
      const d = toDate('2024-06-15T23:59:59.999Z');
      expect(d.getUTCHours()).toBe(23);
      expect(d.getUTCMinutes()).toBe(59);
      expect(d.getUTCSeconds()).toBe(59);
    });
    it('"2024-01-01T00:00:00+05:30" → with timezone offset', () => {
      const d = toDate('2024-01-01T00:00:00+05:30');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
    it('"2024-01-01T00:00:00-08:00" → with negative timezone offset', () => {
      const d = toDate('2024-01-01T00:00:00-08:00');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
  });

  describe('other valid string formats → Date', () => {
    it('"2024" → year only (Jan 1 UTC)', () => {
      const d = toDate('2024');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
    it('"2024-06" → year-month (Jun 1 UTC)', () => {
      const d = toDate('2024-06');
      expect(d).toBeInstanceOf(Date);
      expect(d.getUTCMonth()).toBe(5);
    });
    it('RFC2822 format "Mon, 15 Jan 2024 12:00:00 GMT" → Date', () => {
      const d = toDate('Mon, 15 Jan 2024 12:00:00 GMT');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
  });

  describe('invalid string values throw ConvertError', () => {
    it('"not-a-date" throws', () => expect(() => toDate('not-a-date')).toThrow(ConvertError));
    it('"" throws (empty string)', () => expect(() => toDate('')).toThrow(ConvertError));
    it('" " throws (spaces only)', () => expect(() => toDate(' ')).toThrow(ConvertError));
    it('"hello" throws', () => expect(() => toDate('hello')).toThrow(ConvertError));
    it('"2024-13-01" throws (invalid month 13)', () => expect(() => toDate('2024-13-01')).toThrow(ConvertError));
    it('"2024-00-01" throws (invalid month 0)', () => expect(() => toDate('2024-00-01')).toThrow(ConvertError));
    it('"2024-01-32" throws (invalid day 32)', () => expect(() => toDate('2024-01-32')).toThrow(ConvertError));
    it('"2023-02-29" V8 coerces to Mar 1 2023 (does not throw)', () => {
      // V8 overflows out-of-range days: Feb 29 in a non-leap year → Mar 1
      const d = toDate('2023-02-29');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
    it('"2024-02-30" V8 coerces to Mar 1 2024 (does not throw)', () => {
      // V8 overflows Feb 30 → Mar 1
      const d = toDate('2024-02-30');
      expect(d).toBeInstanceOf(Date);
      expect(isNaN(d.getTime())).toBe(false);
    });
    it('"31/12/2024" throws (dd/mm/yyyy format)', () => expect(() => toDate('31/12/2024')).toThrow(ConvertError));
    it('"abc" throws', () => expect(() => toDate('abc')).toThrow(ConvertError));
    it('"null" throws', () => expect(() => toDate('null')).toThrow(ConvertError));
    it('"undefined" throws', () => expect(() => toDate('undefined')).toThrow(ConvertError));
    it('"T00:00:00Z" throws (time without date)', () => expect(() => toDate('T00:00:00Z')).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('number 1705276800000 (timestamp) throws', () => expect(() => toDate(1705276800000)).toThrow(ConvertError));
    it('number 0 throws', () => expect(() => toDate(0)).toThrow(ConvertError));
    it('number -1 throws', () => expect(() => toDate(-1)).toThrow(ConvertError));
    it('null throws', () => expect(() => toDate(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toDate(undefined)).toThrow(ConvertError));
    it('boolean true throws', () => expect(() => toDate(true)).toThrow(ConvertError));
    it('boolean false throws', () => expect(() => toDate(false)).toThrow(ConvertError));
    it('plain object {} throws', () => expect(() => toDate({})).toThrow(ConvertError));
    it('array [] throws', () => expect(() => toDate([])).toThrow(ConvertError));
    it('function throws', () => expect(() => toDate(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toDate(Symbol('x'))).toThrow(ConvertError));
  });

  describe('error message content', () => {
    it('invalid string error quotes the string value', () => expect(() => toDate('not-a-date')).toThrow(/not-a-date/));
    it('invalid Date instance error says "Invalid Date object"', () => {
      expect(() => toDate(new Date('invalid'))).toThrow(/Invalid Date object/);
    });
    it('number error mentions type', () => expect(() => toDate(123)).toThrow(/number/));
    it('null error mentions type', () => expect(() => toDate(null)).toThrow(/object/));
    it('boolean error mentions type', () => expect(() => toDate(true)).toThrow(/boolean/));
  });

  describe('result is always a valid Date', () => {
    it('result is an instance of Date', () => {
      expect(toDate('2024-01-01')).toBeInstanceOf(Date);
    });
    it('result has a valid getTime()', () => {
      const d = toDate('2024-06-15');
      expect(isNaN(d.getTime())).toBe(false);
    });
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toDate(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1705276800000) throws (even if it looks like a timestamp)', () => expect(() => toDate(BigInt(1705276800000))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toDate(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve("2024-01-01") throws (not a string directly)', () => {
      expect(() => toDate(Promise.resolve('2024-01-01'))).toThrow(ConvertError);
    });
    it('new Promise(() => {}) throws', () => expect(() => toDate(new Promise(() => {}))).toThrow(ConvertError));
    it('Promise.resolve(new Date()) throws', () => expect(() => toDate(Promise.resolve(new Date()))).toThrow(ConvertError));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toDate(() => new Date())).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toDate(function getDate() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toDate(async () => new Date())).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toDate(function* () { yield new Date(); })).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield '2024-01-01'; }
      expect(() => toDate(gen())).toThrow(ConvertError);
    });
    it('function error mentions "function" type', () => expect(() => toDate(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/2024-01-01/ throws', () => expect(() => toDate(/2024-01-01/)).toThrow(ConvertError));
    it('new RegExp("\\\\d{4}") throws', () => expect(() => toDate(new RegExp('\\d{4}'))).toThrow(ConvertError));
    it('RegExp error mentions "object" type', () => expect(() => toDate(/x/)).toThrow(/object/));
  });

  describe('Map / Set / WeakMap / WeakSet throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toDate(new Map())).toThrow(ConvertError));
    it('Map with date entry throws', () => expect(() => toDate(new Map([['date', '2024-01-01']]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toDate(new Set())).toThrow(ConvertError));
    it('Set with dates throws', () => expect(() => toDate(new Set(['2024-01-01']))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toDate(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toDate(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toDate(new Error('x'))).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toDate(new TypeError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays and buffers throw ConvertError', () => {
    it('Uint8Array throws', () => expect(() => toDate(new Uint8Array([1, 2, 3]))).toThrow(ConvertError));
    it('Float64Array throws', () => expect(() => toDate(new Float64Array([1705276800000]))).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toDate(new ArrayBuffer(8))).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('plain class with no props throws', () => {
      class Empty {}
      expect(() => toDate(new Empty())).toThrow(ConvertError);
    });
    it('class with dateString prop throws (not a Date instance)', () => {
      class Wrapper { constructor(public iso: string) {} }
      expect(() => toDate(new Wrapper('2024-01-01'))).toThrow(ConvertError);
    });
    it('class extending Date IS a Date instance → valid', () => {
      class MyDate extends Date {}
      const d = new MyDate('2024-01-01');
      expect(toDate(d)).toBeInstanceOf(Date);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("date") throws', () => expect(() => toDate(Symbol('date'))).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toDate(Symbol())).toThrow(ConvertError));
    it('Symbol error mentions "symbol" type', () => expect(() => toDate(Symbol('x'))).toThrow(/symbol/));
  });
});
