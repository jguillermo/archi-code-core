import { describe, expect, it } from '@jest/globals';
import { toEnum, ConvertError } from '../../src/convert';

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

const COLORS = ['red', 'green', 'blue'];
const NUMS = ['0', '1', '2', '-1'];
const BOOLS = ['true', 'false'];

describe('toEnum', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('string in options → same string returned', () => {
    it('"red" in COLORS → "red"', () => expect(toEnum('red', COLORS)).toBe('red'));
    it('"blue" in COLORS → "blue"', () => expect(toEnum('blue', COLORS)).toBe('blue'));
    it('"0" in NUMS → "0"', () => expect(toEnum('0', NUMS)).toBe('0'));
    it('"-1" in NUMS → "-1"', () => expect(toEnum('-1', NUMS)).toBe('-1'));
    it('"true" in BOOLS → "true"', () => expect(toEnum('true', BOOLS)).toBe('true'));
    it('"" in ["","a"] → ""', () => expect(toEnum('', ['', 'a'])).toBe(''));
  });

  describe('number in options → same number returned', () => {
    it('1 in ["1","2","3"] → 1', () => expect(toEnum(1, ['1', '2', '3'])).toBe(1));
    it('0 in ["0","1"] → 0', () => expect(toEnum(0, ['0', '1'])).toBe(0));
    it('3.14 in ["3.14"] → 3.14', () => expect(toEnum(3.14, ['3.14'])).toBe(3.14));
  });

  describe('boolean in options → same boolean returned', () => {
    it('true in ["true","false"] → true', () => expect(toEnum(true, BOOLS)).toBe(true));
    it('false in ["true","false"] → false', () => expect(toEnum(false, BOOLS)).toBe(false));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('null / undefined — separate messages for each', () => {
    // Current impl uses combined "null/undefined" — new messages should be specific
    it('null → "Cannot convert null to enum"  (NOT combined "null/undefined")', () =>
      expectConvertError(() => toEnum(null, COLORS), 'Cannot convert null to enum'));
    it('undefined → "Cannot convert undefined to enum"  (NOT combined "null/undefined")', () =>
      expectConvertError(() => toEnum(undefined, COLORS), 'Cannot convert undefined to enum'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to enum"  (NOT "object")', () =>
      expectConvertError(() => toEnum({}, COLORS), 'Cannot convert {} to enum'));
    it('{ color: "red" } → \'Cannot convert {"color":"red"} to enum\'', () =>
      expectConvertError(() => toEnum({ color: 'red' }, COLORS), 'Cannot convert {"color":"red"} to enum'));
    it('[] → "Cannot convert [] to enum"', () =>
      expectConvertError(() => toEnum([], COLORS), 'Cannot convert [] to enum'));
    it('["red"] → "Cannot convert ["red"] to enum" (array ≠ string)', () =>
      expectConvertError(() => toEnum(['red'], COLORS), 'Cannot convert ["red"] to enum'));
  });

  describe('functions — show [Function]', () => {
    it('arrow fn → "Cannot convert [Function] to enum"  (NOT "function")', () =>
      expectConvertError(() => toEnum(() => {}, COLORS), 'Cannot convert [Function] to enum'));
    it('named fn → "Cannot convert [Function: getColor] to enum"', () =>
      expectConvertError(() => toEnum(function getColor() {}, COLORS), 'Cannot convert [Function: getColor] to enum'));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("red") → "Cannot convert Symbol(red) to enum"  (NOT "symbol")', () =>
      expectConvertError(() => toEnum(Symbol('red'), COLORS), 'Cannot convert Symbol(red) to enum'));
    it('Symbol() → "Cannot convert Symbol() to enum"', () =>
      expectConvertError(() => toEnum(Symbol(), COLORS), 'Cannot convert Symbol() to enum'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(1) → "Cannot convert BigInt(1) to enum"  (NOT "bigint")', () =>
      expectConvertError(() => toEnum(BigInt(1), COLORS), 'Cannot convert BigInt(1) to enum'));
    it('BigInt(0) → "Cannot convert BigInt(0) to enum"', () =>
      expectConvertError(() => toEnum(BigInt(0), COLORS), 'Cannot convert BigInt(0) to enum'));
  });

  describe('well-known objects — show type name', () => {
    it('new Map() → "Cannot convert [Map] to enum"  (NOT "object")', () =>
      expectConvertError(() => toEnum(new Map(), COLORS), 'Cannot convert [Map] to enum'));
    it('new Set() → "Cannot convert [Set] to enum"', () =>
      expectConvertError(() => toEnum(new Set(), COLORS), 'Cannot convert [Set] to enum'));
    it('new Date() → "Cannot convert [Date] to enum"', () =>
      expectConvertError(() => toEnum(new Date(), COLORS), 'Cannot convert [Date] to enum'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to enum"', () =>
      expectConvertError(() => toEnum(new Promise(() => {}), COLORS), 'Cannot convert [Promise] to enum'));
    it('new Error("x") → "Cannot convert [Error] to enum"', () =>
      expectConvertError(() => toEnum(new Error('x'), COLORS), 'Cannot convert [Error] to enum'));
  });

  describe('value not in options — message quotes the STRING form of the value', () => {
    it('"yellow" → \'"yellow" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum('yellow', COLORS), '"yellow" is not a valid enum option'));
    it('"RED" wrong case → \'"RED" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum('RED', COLORS), '"RED" is not a valid enum option'));
    it('"red " trailing space → \'"red " is not a valid enum option\' (no trim)', () =>
      expectConvertError(() => toEnum('red ', COLORS), '"red " is not a valid enum option'));
    it('" red" leading space → \'" red" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum(' red', COLORS), '" red" is not a valid enum option'));
    it('"" not in COLORS → \'"" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum('', COLORS), '"" is not a valid enum option'));
    it('number 4 → \'"4" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum(4, ['1', '2', '3']), '"4" is not a valid enum option'));
    it('true not in ["false"] → \'"true" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum(true, ['false']), '"true" is not a valid enum option'));
    it('"red" with [] → \'"red" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum('red', []), '"red" is not a valid enum option'));
  });
});
