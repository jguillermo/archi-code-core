import { afterEach, describe, expect, it } from '@jest/globals';
import { toDate, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';
import timezone_mock from 'timezone-mock';

const value = <T>(r: Converted<T>): T | null => r.value;

const fail = (error: string): unknown => ({ ok: false, value: null, error });

const parseDateLax = (v: unknown): Date | undefined => {
  const r = toDate(v, { lax: true });
  return r.ok ? r.value : undefined;
};

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

describe('convert rules — { ok, value, error }', () => {
  describe('toDate — real calendar dates, UTC when no zone is given', () => {
    afterEach(() => timezone_mock.unregister());

    it('date-only and zone-less date-time are both UTC, on any machine time zone', () => {
      for (const tz of ['UTC', 'US/Pacific', 'Europe/London', 'Australia/Adelaide'] as const) {
        timezone_mock.register(tz);
        expect(value(toDate('2024-01-01'))?.getTime()).toBe(Date.UTC(2024, 0, 1));
        expect(value(toDate('2024-01-01T10:30:00', { iso: true }))?.getTime()).toBe(
          Date.UTC(2024, 0, 1, 10, 30),
        );
        expect(value(toDate('2024-01-01 10:30:00', { iso: true }))?.getTime()).toBe(
          Date.UTC(2024, 0, 1, 10, 30),
        );
        timezone_mock.unregister();
      }
    });

    it('explicit zones are honoured', () => {
      expect(value(toDate('2024-01-01T10:00:00+02:00', { iso: true }))?.getTime()).toBe(
        Date.UTC(2024, 0, 1, 8),
      );
      expect(value(toDate('2024-01-01T10:00:00.250Z', { iso: true }))?.getTime()).toBe(
        Date.UTC(2024, 0, 1, 10, 0, 0, 250),
      );
    });

    it('leap years follow the Gregorian rule, including year 0000', () => {
      expect(toDate('2024-02-29').ok).toBe(true);
      expect(toDate('2000-02-29').ok).toBe(true);
      expect(toDate('0000-02-29').ok).toBe(true);
      expect(toDate('1900-02-29')).toEqual({ ok: false, value: null, error: ConvertMessages.DATE });
      expect(toDate('2023-02-29')).toEqual({ ok: false, value: null, error: ConvertMessages.DATE });
    });

    it.each([
      ['2024-02-30'],
      ['2024-13-01'],
      ['2024-01-01T24:00:00'],
      ['2024-01-01T00:00:00+24:00'],
      ['2024-01-01T00:00:00+01:60'],
      ['2018-03-23Z'],
      ['01/02/2024'],
      [42],
      [new Date('x')],
    ])('%p → { ok: false, error }', (input) =>
      expect(toDate(input)).toEqual({ ok: false, value: null, error: ConvertMessages.DATE }),
    );

    it('valid Date instances are returned as-is', () => {
      const d = new Date(0);
      expect(value(toDate(d))).toBe(d);
    });
  });
});

describe('toDate format (ported from isDate)', () => {
  it('parses by the given format and returns the UTC date', () => {
    const r = toDate('31/01/2024', { format: 'DD/MM/YYYY' });
    expect(r.ok && r.value.toISOString()).toBe('2024-01-31T00:00:00.000Z');
    expect(toDate('31/01/2024')).toEqual(fail(ConvertMessages.DATE));
  });
  it('rejects impossible dates and honours strictMode', () => {
    expect(toDate('2024/02/30', { format: 'YYYY/MM/DD' })).toEqual(fail(ConvertMessages.DATE));
    expect(toDate('2024-01-31', { format: 'YYYY/MM/DD' }).ok).toBe(true);
    expect(toDate('2024-01-31', { format: 'YYYY/MM/DD', strictMode: true }).ok).toBe(false);
  });
  it('Date instances are accepted unless strictMode', () => {
    expect(toDate(new Date(0), { format: 'YYYY/MM/DD' }).ok).toBe(true);
    expect(toDate(new Date(0), { format: 'YYYY/MM/DD', strictMode: true }).ok).toBe(false);
  });
});

describe('toDate iso (the former default ISO rule)', () => {
  it('reads date-times and zones; rejects impossible values', () => {
    expect(toDate('2024-01-01T10:00:00+02:00', { iso: true }).ok).toBe(true);
    for (const v of [
      '2024-02-30',
      '2024-01-01T24:00:00',
      '2024-01-01T10:00:00+01:60',
      '2024/01/01',
      42,
      new Date('x'),
    ]) {
      expect(toDate(v, { iso: true })).toEqual(fail(ConvertMessages.DATE));
    }
    const d = new Date(0);
    expect(toDate(d, { iso: true })).toEqual({ ok: true, value: d, error: null });
  });
});

describe('toDate lax mode (ported from isAfter / isBefore)', () => {
  afterEach(() => timezone_mock.unregister());

  it('accepts valid Date instances and rejects invalid ones', () => {
    const d = new Date(0);
    expect(parseDateLax(d)).toBe(d);
    expect(parseDateLax(new Date('x'))).toBeUndefined();
  });

  it('accepts ISO 8601 reduced precision forms', () => {
    expect(parseDateLax('2024')?.getTime()).toBe(Date.UTC(2024, 0, 1));
    expect(parseDateLax('2024-03')?.getTime()).toBe(Date.UTC(2024, 2, 1));
    expect(parseDateLax('2024-03-05')?.getTime()).toBe(Date.UTC(2024, 2, 5));
    expect(parseDateLax('2024-03-05T10:20')?.getTime()).toBe(Date.UTC(2024, 2, 5, 10, 20));
    expect(parseDateLax('2024-03-05T10:20:30.5+01:00')?.getTime()).toBe(
      Date.UTC(2024, 2, 5, 9, 20, 30, 500),
    );
  });

  it('zone-less date-times are UTC regardless of the machine time zone', () => {
    timezone_mock.register('US/Pacific');
    expect(parseDateLax('2024-03-05T10:20:30')?.getTime()).toBe(Date.UTC(2024, 2, 5, 10, 20, 30));
  });

  it('accepts Date#toString() and Date#toUTCString() output (explicit offset)', () => {
    const d = new Date(Date.UTC(2011, 8, 10, 12));
    expect(parseDateLax(d.toString())?.getTime()).toBe(d.getTime());
    expect(parseDateLax(d.toUTCString())?.getTime()).toBe(d.getTime());
  });

  it.each([
    ['01/02/2024'], // engine-dependent
    ['March 7, 2024'],
    ['2024-02-30'],
    ['2023-02-29'],
    ['2024-13'],
    ['2024-00-10'],
    ['2024-01-01T24:00'],
    ['2024-01-01T10:60'],
    ['2024-01-01T10:00:60'],
    ['2024-01-01T10:00+24:00'],
    ['2024-01-01T10:00+01:60'],
    ['Sat Sep 10 2011 12:00:00 GMT+9999'],
    [42],
    [null],
  ])('%p → undefined', (input) => expect(parseDateLax(input)).toBeUndefined());

  it('leap day handling', () => {
    expect(parseDateLax('2024-02-29')).toBeInstanceOf(Date);
    expect(parseDateLax('1900-02-29')).toBeUndefined();
  });
});

describe('toDate default rule never throws on unusable format options', () => {
  it('format delimiter not among `delimiters` → { ok: false }', () => {
    expect(toDate('2024.01.02', { format: 'YYYY.MM.DD' })).toEqual(fail(ConvertMessages.DATE));
    expect(converted(toDate('2024.01.02', { format: 'YYYY.MM.DD', delimiters: ['.'] }))).toEqual(
      new Date('2024-01-02T00:00:00.000Z'),
    );
  });
  it('non-array `delimiters` → { ok: false }', () => {
    expect(toDate('2024/01/02', { delimiters: '/' as unknown as string[] })).toEqual(
      fail(ConvertMessages.DATE),
    );
  });
});
