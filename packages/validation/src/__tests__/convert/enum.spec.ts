import { describe, expect, it } from '@jest/globals';
import { toBeEnum, ConvertError } from '../../convert';

const COLORS = ['red', 'green', 'blue'];

describe('toBeEnum', () => {
  describe('valid conversions', () => {
    it('"red" in COLORS → "red"', () => expect(toBeEnum('red', COLORS)).toBe('red'));
    it('"blue" in COLORS → "blue"', () => expect(toBeEnum('blue', COLORS)).toBe('blue'));
    it('number 1 in ["1","2","3"] → 1', () => expect(toBeEnum(1, ['1', '2', '3'])).toBe(1));
    it('true in ["true","false"] → true', () =>
      expect(toBeEnum(true, ['true', 'false'])).toBe(true));
  });

  describe('invalid values throw ConvertError', () => {
    it('"yellow" not in COLORS throws', () =>
      expect(() => toBeEnum('yellow', COLORS)).toThrow(ConvertError));
    it('"RED" (wrong case) throws', () =>
      expect(() => toBeEnum('RED', COLORS)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeEnum(null, COLORS)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeEnum(undefined, COLORS)).toThrow(ConvertError));
    it('empty options throws', () => expect(() => toBeEnum('red', [])).toThrow(ConvertError));
  });
});
