import { describe, expect, it } from '@jest/globals';
import { toBoolean, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';

const value = <T>(r: Converted<T>): T | null => r.value;

const fail = (error: string): unknown => ({ ok: false, value: null, error });

describe('toBoolean', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('boolean → same value', () => {
    it('true → true', () => expect(converted(toBoolean(true))).toBe(true));
    it('false → false', () => expect(converted(toBoolean(false))).toBe(false));
  });

  describe('number → boolean (only 1 and 0)', () => {
    it('1 → true', () => expect(converted(toBoolean(1))).toBe(true));
    it('0 → false', () => expect(converted(toBoolean(0))).toBe(false));
    it('-0 → false (-0 === 0)', () => expect(converted(toBoolean(-0))).toBe(false));
  });

  describe('string → boolean (case-insensitive, trims whitespace)', () => {
    it.each(['true', 'TRUE', 'True', 'tRuE', '  true  ', '1', '  1  '])('"%s" → true', (s) =>
      expect(converted(toBoolean(s))).toBe(true),
    );
    it.each(['false', 'FALSE', 'False', 'fAlSe', '  false  ', '0', '  0  '])('"%s" → false', (s) =>
      expect(converted(toBoolean(s))).toBe(false),
    );
  });

  // ─── error cases ──────────────────────────────────────────────────────────
  //

  describe('numbers that are not 0 or 1 → { ok: false, error }', () => {
    it('2 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(2), ConvertMessages.BOOLEAN));
    it('-1 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(-1), ConvertMessages.BOOLEAN));
    it('0.5 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(0.5), ConvertMessages.BOOLEAN));

    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(NaN), ConvertMessages.BOOLEAN));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Infinity), ConvertMessages.BOOLEAN));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(-Infinity), ConvertMessages.BOOLEAN));
  });

  describe('strings that are not true/false/0/1 → { ok: false, error }', () => {
    it('"maybe" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('maybe'), ConvertMessages.BOOLEAN));
    it('"yes" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('yes'), ConvertMessages.BOOLEAN));
    it('"" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(''), ConvertMessages.BOOLEAN));
    it('" " → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(' '), ConvertMessages.BOOLEAN));
    it('"2" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('2'), ConvertMessages.BOOLEAN));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(null), ConvertMessages.BOOLEAN));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(undefined), ConvertMessages.BOOLEAN));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () =>
      expectNotConvertible(toBoolean({}), ConvertMessages.BOOLEAN));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toBoolean({ a: 1 }), ConvertMessages.BOOLEAN));
    it('[] → { ok: false, error }', () =>
      expectNotConvertible(toBoolean([]), ConvertMessages.BOOLEAN));
    it('[true] → { ok: false, error }', () =>
      expectNotConvertible(toBoolean([true]), ConvertMessages.BOOLEAN));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(() => {}),
        ConvertMessages.BOOLEAN,
      ));
    it('async fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(async () => {}),
        ConvertMessages.BOOLEAN,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(function foo() {}),
        ConvertMessages.BOOLEAN,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Symbol('x')), ConvertMessages.BOOLEAN));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Symbol()), ConvertMessages.BOOLEAN));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(BigInt(0)), ConvertMessages.BOOLEAN));
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(BigInt(1)), ConvertMessages.BOOLEAN));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Map()), ConvertMessages.BOOLEAN));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Set()), ConvertMessages.BOOLEAN));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Promise(() => {})), ConvertMessages.BOOLEAN));
    it('/regex/ → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(/regex/), ConvertMessages.BOOLEAN));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Error('x')), ConvertMessages.BOOLEAN));
    it('new Date("2024-01-01") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Date('2024-01-01')), ConvertMessages.BOOLEAN));
  });
});

describe('convert rules — { ok, value, error }', () => {
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
});

describe('toBoolean modes (ported from isBoolean)', () => {
  it('default trims and ignores case; strict does neither', () => {
    expect(toBoolean(' TRUE ')).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean(' TRUE ', { mode: 'strict' })).toEqual(fail(ConvertMessages.BOOLEAN));
    expect(toBoolean('true', { mode: 'strict' })).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean('0', { mode: 'strict' })).toEqual({ ok: true, value: false, error: null });
  });
  it('loose lower-cases (no trim) and accepts yes/no', () => {
    expect(toBoolean('YES', { mode: 'loose' })).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean('No', { mode: 'loose' })).toEqual({ ok: true, value: false, error: null });
    expect(toBoolean(' yes', { mode: 'loose' })).toEqual(fail(ConvertMessages.BOOLEAN));
    expect(toBoolean('yes')).toEqual(fail(ConvertMessages.BOOLEAN));
  });
  it('unknown modes fall back to default (converters never throw)', () => {
    expect(toBoolean(' true ', { mode: 'nope' as never })).toEqual({
      ok: true,
      value: true,
      error: null,
    });
  });
});
