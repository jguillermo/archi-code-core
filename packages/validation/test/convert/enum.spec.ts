import { describe, expect, it } from '@jest/globals';
import { toEnum, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

const COLORS = ['red', 'green', 'blue'];
const NUMS = ['0', '1', '2', '-1'];
const BOOLS = ['true', 'false'];

describe('toEnum', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('string in options → same string returned', () => {
    it('"red" in COLORS → "red"', () => expect(converted(toEnum('red', COLORS))).toBe('red'));
    it('"blue" in COLORS → "blue"', () => expect(converted(toEnum('blue', COLORS))).toBe('blue'));
    it('"0" in NUMS → "0"', () => expect(converted(toEnum('0', NUMS))).toBe('0'));
    it('"-1" in NUMS → "-1"', () => expect(converted(toEnum('-1', NUMS))).toBe('-1'));
    it('"true" in BOOLS → "true"', () => expect(converted(toEnum('true', BOOLS))).toBe('true'));
    it('"" in ["","a"] → ""', () => expect(converted(toEnum('', ['', 'a']))).toBe(''));
  });

  describe('number matching an option → the OPTION (string) is returned', () => {
    it('1 in ["1","2","3"] → "1"', () => expect(converted(toEnum(1, ['1', '2', '3']))).toBe('1'));
    it('0 in ["0","1"] → "0"', () => expect(converted(toEnum(0, ['0', '1']))).toBe('0'));
    it('3.14 in ["3.14"] → "3.14"', () => expect(converted(toEnum(3.14, ['3.14']))).toBe('3.14'));
  });

  describe('boolean matching an option → the OPTION (string) is returned', () => {
    it('true in ["true","false"] → "true"', () =>
      expect(converted(toEnum(true, BOOLS))).toBe('true'));
    it('false in ["true","false"] → "false"', () =>
      expect(converted(toEnum(false, BOOLS))).toBe('false'));
  });

  describe('result is typed as the enum literal union', () => {
    it('converted(toEnum(v, ["a","b"] as const)) → "a" | "b"', () => {
      const r: 'a' | 'b' = converted(toEnum('a', ['a', 'b'] as const));
      expect(r).toBe('a');
    });
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('null / undefined → { ok: false, error }', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toEnum(null, COLORS), ConvertMessages.ENUM));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toEnum(undefined, COLORS), ConvertMessages.ENUM));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () =>
      expectNotConvertible(toEnum({}, COLORS), ConvertMessages.ENUM));
    it('{ color: "red" } → { ok: false, error }', () =>
      expectNotConvertible(toEnum({ color: 'red' }, COLORS), ConvertMessages.ENUM));
    it('[] → { ok: false, error }', () =>
      expectNotConvertible(toEnum([], COLORS), ConvertMessages.ENUM));
    it('["red"] → { ok: false, error }', () =>
      expectNotConvertible(toEnum(['red'], COLORS), ConvertMessages.ENUM));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toEnum(() => {}, COLORS),
        ConvertMessages.ENUM,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toEnum(function getColor() {}, COLORS),
        ConvertMessages.ENUM,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("red") → { ok: false, error }', () =>
      expectNotConvertible(toEnum(Symbol('red'), COLORS), ConvertMessages.ENUM));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toEnum(Symbol(), COLORS), ConvertMessages.ENUM));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toEnum(BigInt(1), COLORS), ConvertMessages.ENUM));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toEnum(BigInt(0), COLORS), ConvertMessages.ENUM));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toEnum(new Map(), COLORS), ConvertMessages.ENUM));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toEnum(new Set(), COLORS), ConvertMessages.ENUM));
    it('new Date() → { ok: false, error }', () =>
      expectNotConvertible(toEnum(new Date(), COLORS), ConvertMessages.ENUM));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toEnum(new Promise(() => {}), COLORS), ConvertMessages.ENUM));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toEnum(new Error('x'), COLORS), ConvertMessages.ENUM));
  });

  describe('value not in options → { ok: false, error }', () => {
    it('"yellow" → { ok: false, error }', () =>
      expectNotConvertible(toEnum('yellow', COLORS), ConvertMessages.ENUM));
    it('"RED" wrong case → { ok: false, error }', () =>
      expectNotConvertible(toEnum('RED', COLORS), ConvertMessages.ENUM));
    it('"red " trailing space → { ok: false, error }', () =>
      expectNotConvertible(toEnum('red ', COLORS), ConvertMessages.ENUM));
    it('" red" leading space → { ok: false, error }', () =>
      expectNotConvertible(toEnum(' red', COLORS), ConvertMessages.ENUM));
    it('"" not in COLORS → { ok: false, error }', () =>
      expectNotConvertible(toEnum('', COLORS), ConvertMessages.ENUM));
    it('number 4 → { ok: false, error }', () =>
      expectNotConvertible(toEnum(4, ['1', '2', '3']), ConvertMessages.ENUM));
    it('true not in ["false"] → { ok: false, error }', () =>
      expectNotConvertible(toEnum(true, ['false']), ConvertMessages.ENUM));
    it('"red" with [] → { ok: false, error }', () =>
      expectNotConvertible(toEnum('red', []), ConvertMessages.ENUM));
  });
});
