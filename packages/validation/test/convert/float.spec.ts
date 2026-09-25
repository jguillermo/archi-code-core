import { describe, expect, it } from '@jest/globals';
import { toFloat, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';

const value = <T>(r: Converted<T>): T | null => r.value;

const fail = (error: string): unknown => ({ ok: false, value: null, error });

describe('toFloat', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('finite number → same value', () => {
    it('0 → 0', () => expect(converted(toFloat(0))).toBe(0));
    it('-0 → -0', () => expect(Object.is(converted(toFloat(-0)), -0)).toBe(true));
    it('3.14 → 3.14', () => expect(converted(toFloat(3.14))).toBe(3.14));
    it('42 → 42', () => expect(converted(toFloat(42))).toBe(42));
    it('Number.MAX_VALUE → same', () =>
      expect(converted(toFloat(Number.MAX_VALUE))).toBe(Number.MAX_VALUE));
    it('Number.EPSILON → same', () =>
      expect(converted(toFloat(Number.EPSILON))).toBe(Number.EPSILON));
  });

  describe('string → parsed float', () => {
    it('"3.14" → 3.14', () => expect(converted(toFloat('3.14'))).toBe(3.14));
    it('"42" → 42', () => expect(converted(toFloat('42'))).toBe(42));
    it('"  -1.5  " → -1.5 (trims)', () => expect(converted(toFloat('  -1.5  '))).toBe(-1.5));
    it('".5" → 0.5 (leading dot)', () => expect(converted(toFloat('.5'))).toBe(0.5));
    it('"5." → 5 (trailing dot)', () => expect(converted(toFloat('5.'))).toBe(5));
    it('"+3.14" → 3.14', () => expect(converted(toFloat('+3.14'))).toBe(3.14));
    it('"1e5" → 100000', () => expect(converted(toFloat('1e5'))).toBe(100000));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-finite numbers → { ok: false, error }', () => {
    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toFloat(NaN), ConvertMessages.FLOAT));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Infinity), ConvertMessages.FLOAT));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toFloat(-Infinity), ConvertMessages.FLOAT));
  });

  describe('empty / whitespace strings → { ok: false, error }', () => {
    it('"" → { ok: false, error }', () => expectNotConvertible(toFloat(''), ConvertMessages.FLOAT));
    it('" " → { ok: false, error }', () =>
      expectNotConvertible(toFloat(' '), ConvertMessages.FLOAT));
    it('"   " → { ok: false, error }', () =>
      expectNotConvertible(toFloat('   '), ConvertMessages.FLOAT));
  });

  describe('non-numeric strings → { ok: false, error }', () => {
    it('"hello" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('hello'), ConvertMessages.FLOAT));
    it('"Infinity" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('Infinity'), ConvertMessages.FLOAT));
    it('"NaN" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('NaN'), ConvertMessages.FLOAT));
    it('" hello " → { ok: false, error }', () =>
      expectNotConvertible(toFloat(' hello '), ConvertMessages.FLOAT));
    it('"1,234" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('1,234'), ConvertMessages.FLOAT));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toFloat(null), ConvertMessages.FLOAT));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toFloat(undefined), ConvertMessages.FLOAT));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toFloat(true), ConvertMessages.FLOAT));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toFloat(false), ConvertMessages.FLOAT));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toFloat({}), ConvertMessages.FLOAT));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toFloat({ a: 1 }), ConvertMessages.FLOAT));
    it('[] → { ok: false, error }', () => expectNotConvertible(toFloat([]), ConvertMessages.FLOAT));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toFloat(() => 3.14),
        ConvertMessages.FLOAT,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toFloat(function calc() {}),
        ConvertMessages.FLOAT,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("pi") → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Symbol('pi')), ConvertMessages.FLOAT));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Symbol()), ConvertMessages.FLOAT));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(BigInt(1)), ConvertMessages.FLOAT));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(BigInt(0)), ConvertMessages.FLOAT));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Map()), ConvertMessages.FLOAT));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Set()), ConvertMessages.FLOAT));
    it('new Date() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Date()), ConvertMessages.FLOAT));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Promise(() => {})), ConvertMessages.FLOAT));
    it('new Uint8Array() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Uint8Array()), ConvertMessages.FLOAT));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Error('x')), ConvertMessages.FLOAT));
  });
});

describe('convert rules — { ok, value, error }', () => {
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
});

describe('toFloat syntax: validator (ported from isFloat)', () => {
  it('does not trim and honours the decimal separator', () => {
    expect(toFloat(' 1.5', { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
    expect(toFloat('1.5', { syntax: 'validator' })).toEqual({ ok: true, value: 1.5, error: null });
    expect(toFloat('1,5', { syntax: 'validator', decimalSeparator: ',' })).toEqual({
      ok: true,
      value: 1.5,
      error: null,
    });
    expect(toFloat('1,5', { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
  });
  it('a success always holds a finite number: forms without digits and out-of-range values fail', () => {
    for (const input of ['.e5', 'e5', '-e5', '1e400', '-1e400']) {
      expect(toFloat(input, { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
    }
    expect(toFloat('.e5').ok).toBe(false);
  });
  it('returns the value read with the configured separator (not only ",")', () => {
    expect(toFloat('1٫5', { syntax: 'validator', decimalSeparator: '٫' })).toEqual({
      ok: true,
      value: 1.5,
      error: null,
    });
    expect(toFloat('1*5', { syntax: 'validator', decimalSeparator: '*' })).toEqual({
      ok: true,
      value: 1.5,
      error: null,
    });
    expect(toFloat('15', { syntax: 'validator', decimalSeparator: '' })).toEqual({
      ok: true,
      value: 15,
      error: null,
    });
  });
  it('numbers: finite only; unreadable values fail', () => {
    expect(toFloat(Infinity, { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
    expect(toFloat(2, { syntax: 'validator' })).toEqual({ ok: true, value: 2, error: null });
    expect(toFloat({}, { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
  });
  it('the separator is escaped (no regex injection) and the regex cache is bounded', () => {
    expect(toFloat('1*5', { syntax: 'validator', decimalSeparator: '*' }).ok).toBe(true);
    expect(toFloat('1x5', { syntax: 'validator', decimalSeparator: '*' }).ok).toBe(false);
    for (let i = 0; i < 100; i++) toFloat('1', { syntax: 'validator', decimalSeparator: `s${i}` });
    expect(toFloat('1s995', { syntax: 'validator', decimalSeparator: 's99' }).ok).toBe(true);
  });
});
