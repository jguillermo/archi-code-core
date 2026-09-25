import { describe, expect, it } from '@jest/globals';
import { toInteger, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';

const value = <T>(r: Converted<T>): T | null => r.value;

const fail = (error: string): unknown => ({ ok: false, value: null, error });

describe('toInteger', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('integer number → same value', () => {
    it('0 → 0', () => expect(converted(toInteger(0))).toBe(0));
    it('42 → 42', () => expect(converted(toInteger(42))).toBe(42));
    it('-7 → -7', () => expect(converted(toInteger(-7))).toBe(-7));
    it('1.0 → 1 (integer-valued float)', () => expect(converted(toInteger(1.0))).toBe(1));
    it('Number.MAX_SAFE_INTEGER → same', () =>
      expect(converted(toInteger(Number.MAX_SAFE_INTEGER))).toBe(9007199254740991));
    it('Number.MIN_SAFE_INTEGER → same', () =>
      expect(converted(toInteger(Number.MIN_SAFE_INTEGER))).toBe(-9007199254740991));
  });

  describe('string → parsed integer', () => {
    it('"42" → 42', () => expect(converted(toInteger('42'))).toBe(42));
    it('"-7" → -7', () => expect(converted(toInteger('-7'))).toBe(-7));
    it('"0" → 0', () => expect(converted(toInteger('0'))).toBe(0));
    it('"  10  " → 10 (trimmed)', () => expect(converted(toInteger('  10  '))).toBe(10));
    it('"007" → 7 (decimal, not octal)', () => expect(converted(toInteger('007'))).toBe(7));
    it('"-0" → -0 (parseInt preserves -0)', () =>
      expect(Object.is(converted(toInteger('-0')), -0)).toBe(true));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-finite / non-integer numbers → { ok: false, error }', () => {
    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toInteger(NaN), ConvertMessages.INTEGER));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toInteger(Infinity), ConvertMessages.INTEGER));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toInteger(-Infinity), ConvertMessages.INTEGER));
    it('3.14 → { ok: false, error }', () =>
      expectNotConvertible(toInteger(3.14), ConvertMessages.INTEGER));
    it('-3.14 → { ok: false, error }', () =>
      expectNotConvertible(toInteger(-3.14), ConvertMessages.INTEGER));
    it('0.5 → { ok: false, error }', () =>
      expectNotConvertible(toInteger(0.5), ConvertMessages.INTEGER));
  });

  describe('invalid strings → { ok: false, error }', () => {
    it('"abc" → { ok: false, error }', () =>
      expectNotConvertible(toInteger('abc'), ConvertMessages.INTEGER));
    it('"3.14" → { ok: false, error }', () =>
      expectNotConvertible(toInteger('3.14'), ConvertMessages.INTEGER));
    it('"" → { ok: false, error }', () =>
      expectNotConvertible(toInteger(''), ConvertMessages.INTEGER));
    it('" " → { ok: false, error }', () =>
      expectNotConvertible(toInteger(' '), ConvertMessages.INTEGER));
    it('"  abc  " → { ok: false, error }', () =>
      expectNotConvertible(toInteger('  abc  '), ConvertMessages.INTEGER));
    it('"+42" → { ok: false, error }', () =>
      expectNotConvertible(toInteger('+42'), ConvertMessages.INTEGER));
    it('"1e5" → { ok: false, error }', () =>
      expectNotConvertible(toInteger('1e5'), ConvertMessages.INTEGER));
    it('"0xFF" → { ok: false, error }', () =>
      expectNotConvertible(toInteger('0xFF'), ConvertMessages.INTEGER));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toInteger(null), ConvertMessages.INTEGER));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toInteger(undefined), ConvertMessages.INTEGER));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toInteger(true), ConvertMessages.INTEGER));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toInteger(false), ConvertMessages.INTEGER));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () =>
      expectNotConvertible(toInteger({}), ConvertMessages.INTEGER));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toInteger({ a: 1 }), ConvertMessages.INTEGER));
    it('[] → { ok: false, error }', () =>
      expectNotConvertible(toInteger([]), ConvertMessages.INTEGER));
    it('[42] → { ok: false, error }', () =>
      expectNotConvertible(toInteger([42]), ConvertMessages.INTEGER));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toInteger(() => 42),
        ConvertMessages.INTEGER,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toInteger(function foo() {}),
        ConvertMessages.INTEGER,
      ));
    it('async fn → { ok: false, error }', () =>
      expectNotConvertible(
        toInteger(async () => 42),
        ConvertMessages.INTEGER,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toInteger(Symbol('x')), ConvertMessages.INTEGER));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toInteger(Symbol()), ConvertMessages.INTEGER));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toInteger(BigInt(1)), ConvertMessages.INTEGER));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toInteger(BigInt(0)), ConvertMessages.INTEGER));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Map()), ConvertMessages.INTEGER));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Set()), ConvertMessages.INTEGER));
    it('new Date() → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Date()), ConvertMessages.INTEGER));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Promise(() => {})), ConvertMessages.INTEGER));
    it('new Uint8Array() → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Uint8Array()), ConvertMessages.INTEGER));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toInteger(new Error('x')), ConvertMessages.INTEGER));
  });
});

describe('convert rules — { ok, value, error }', () => {
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
});

describe('toInteger syntax: validator (ported from isInt)', () => {
  it('accepts a leading +, does not trim, has no safe-range limit', () => {
    expect(toInteger('+12', { syntax: 'validator' })).toEqual({ ok: true, value: 12, error: null });
    expect(toInteger('+12')).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger(' 12', { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger('9007199254740993', { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger(1e21, { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger(1.5, { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger(null, { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
  });
  it('integers too large for a finite number → INTEGER_OVERFLOW (never ok with Infinity)', () => {
    expect(toInteger('9'.repeat(400), { syntax: 'validator' })).toEqual(
      fail(ConvertMessages.INTEGER_OVERFLOW),
    );
    expect(toInteger(`-${'9'.repeat(400)}`, { syntax: 'validator' })).toEqual(
      fail(ConvertMessages.INTEGER_OVERFLOW),
    );
  });
  it('allowLeadingZeroes: false rejects "012"', () => {
    expect(toInteger('012', { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger('012', { syntax: 'validator', allowLeadingZeroes: false }).ok).toBe(false);
  });
});
