import { describe, expect, it, afterEach } from '@jest/globals';
import timezone_mock from 'timezone-mock';
import {
  toArray,
  toBoolean,
  toDate,
  toEnum,
  toFloat,
  toInteger,
  toJson,
  toString,
} from '../../src/convert';
import { ConvertMessages } from '../../src/convert';
import type { Converted } from '../../src/convert';
import { asString } from '../../src/core/coerce';

const value = <T>(r: Converted<T>): T | null => r.value;

describe('core/coerce', () => {
  it('asString: strings, booleans and finite numbers only', () => {
    expect(asString('a')).toBe('a');
    expect(asString(true)).toBe('true');
    expect(asString(false)).toBe('false');
    expect(asString(1.5)).toBe('1.5');
    expect(asString(NaN)).toBeUndefined();
    expect(asString(Infinity)).toBeUndefined();
    expect(asString(null)).toBeUndefined();
    expect(asString({})).toBeUndefined();
  });
});

describe('convert rules — { ok, value, error }', () => {
  it('every result has exactly { ok, value, error }', () => {
    expect(toBoolean('false')).toEqual({ ok: true, value: false, error: null });
    expect(toBoolean('maybe')).toEqual({ ok: false, value: null, error: ConvertMessages.BOOLEAN });
    expect(toInteger('42')).toEqual({ ok: true, value: 42, error: null });
    expect(toEnum(1, ['1'])).toEqual({ ok: true, value: '1', error: null });
    expect(Object.keys(toArray('[]')).sort()).toEqual(['error', 'ok', 'value']);
    expect(Object.keys(toArray('x')).sort()).toEqual(['error', 'ok', 'value']);
  });

  describe('toString', () => {
    it('mirrors asString; failure is { ok: false, value: null, error }', () => {
      expect(toString(null)).toEqual({ ok: false, value: null, error: ConvertMessages.STRING });
      expect(value(toString(12))).toBe('12');
      expect(toString(undefined)).toEqual({
        ok: false,
        value: null,
        error: ConvertMessages.STRING,
      });
    });
  });

  describe('toBoolean', () => {
    it.each([
      [true, true],
      [false, false],
      [1, true],
      [0, false],
      [' TRUE ', true],
      ['0', false],
    ])('%p → %p', (input, expected) => expect(value(toBoolean(input))).toBe(expected));
    it.each([[2], ['yes'], [null], [{}]])('%p → { ok: false, error }', (input) =>
      expect(toBoolean(input)).toEqual({ ok: false, value: null, error: ConvertMessages.BOOLEAN }),
    );
  });

  describe('toInteger — safe integers only', () => {
    it('accepts the safe range limits', () => {
      expect(value(toInteger(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
      expect(value(toInteger(String(Number.MIN_SAFE_INTEGER)))).toBe(Number.MIN_SAFE_INTEGER);
      expect(value(toInteger(' 42 '))).toBe(42);
    });
    it('integers beyond ±MAX_SAFE_INTEGER → { ok: false, error: INTEGER_OVERFLOW } (no exception)', () => {
      for (const v of [
        '9007199254740993',
        ' -9007199254740992 ',
        '9'.repeat(100),
        Number.MAX_SAFE_INTEGER + 1,
        1e21,
      ]) {
        expect(toInteger(v)).toEqual({
          ok: false,
          value: null,
          error: ConvertMessages.INTEGER_OVERFLOW,
        });
      }
      expect(ConvertMessages.INTEGER_OVERFLOW).toBe(
        'Integer exceeds the safe integer limits (-9007199254740991 to 9007199254740991)',
      );
    });
    it('rejects non-integers', () => {
      expect(toInteger('1.0')).toEqual({ ok: false, value: null, error: ConvertMessages.INTEGER });
      expect(toInteger('+1')).toEqual({ ok: false, value: null, error: ConvertMessages.INTEGER });
      expect(toInteger(1.5)).toEqual({ ok: false, value: null, error: ConvertMessages.INTEGER });
      expect(toInteger(true)).toEqual({ ok: false, value: null, error: ConvertMessages.INTEGER });
    });
  });

  describe('toFloat — plain decimal notation only', () => {
    it.each([
      ['1.5', 1.5],
      [' -.5 ', -0.5],
      ['+1.', 1],
      ['1e3', 1000],
      ['2E-2', 0.02],
      [3, 3],
    ])('%p → %p', (input, expected) => expect(value(toFloat(input))).toBe(expected));
    it.each([
      ['0x10'],
      ['0b101'],
      ['0o7'],
      ['Infinity'],
      ['1e400'],
      [''],
      ['.'],
      ['1,5'],
      [NaN],
      [null],
    ])('%p → { ok: false, error }', (input) =>
      expect(toFloat(input)).toEqual({ ok: false, value: null, error: ConvertMessages.FLOAT }),
    );
  });

  describe('toDate — real calendar dates, UTC when no zone is given', () => {
    afterEach(() => timezone_mock.unregister());

    it('date-only and zone-less date-time are both UTC, on any machine time zone', () => {
      for (const tz of ['UTC', 'US/Pacific', 'Europe/London', 'Australia/Adelaide'] as const) {
        timezone_mock.register(tz);
        expect(value(toDate('2024-01-01'))?.getTime()).toBe(Date.UTC(2024, 0, 1));
        expect(value(toDate('2024-01-01T10:30:00'))?.getTime()).toBe(Date.UTC(2024, 0, 1, 10, 30));
        expect(value(toDate('2024-01-01 10:30:00'))?.getTime()).toBe(Date.UTC(2024, 0, 1, 10, 30));
        timezone_mock.unregister();
      }
    });

    it('explicit zones are honoured', () => {
      expect(value(toDate('2024-01-01T10:00:00+02:00'))?.getTime()).toBe(Date.UTC(2024, 0, 1, 8));
      expect(value(toDate('2024-01-01T10:00:00.250Z'))?.getTime()).toBe(
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

  describe('toJson / toArray — single JSON.parse', () => {
    it('toJson', () => {
      expect(value(toJson('{"a":1}'))).toEqual({ a: 1 });
      expect(toJson('[1]')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      expect(toJson('{}')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      expect(toJson('{')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      expect(toJson(circular)).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      const obj = { a: 1 };
      expect(value(toJson(obj))).toBe(obj);
    });
    it('toArray', () => {
      expect(value(toArray('[1,2]'))).toEqual([1, 2]);
      expect(toArray('{"a":1}')).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
      expect(toArray('[')).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
      expect(toArray(1)).toEqual({ ok: false, value: null, error: ConvertMessages.ARRAY });
    });
  });

  describe('toEnum — returns the matching OPTION', () => {
    it('by text form', () => {
      expect(value(toEnum(1, ['1', '2']))).toBe('1');
      expect(value(toEnum(true, ['true']))).toBe('true');
      expect(value(toEnum('b', ['a', 'b']))).toBe('b');
    });
    it('rejects unknown values and non-primitives (prototype keys included)', () => {
      expect(toEnum('c', ['a', 'b'])).toEqual({
        ok: false,
        value: null,
        error: ConvertMessages.ENUM,
      });
      expect(toEnum('toString', ['a'])).toEqual({
        ok: false,
        value: null,
        error: ConvertMessages.ENUM,
      });
      expect(toEnum(null, ['null'])).toEqual({
        ok: false,
        value: null,
        error: ConvertMessages.ENUM,
      });
      expect(toEnum({}, ['[object Object]'])).toEqual({
        ok: false,
        value: null,
        error: ConvertMessages.ENUM,
      });
    });
  });
});
