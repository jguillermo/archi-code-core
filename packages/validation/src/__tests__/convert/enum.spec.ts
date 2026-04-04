import { describe, expect, it } from '@jest/globals';
import { toEnum, ConvertError } from '../../convert';

const COLORS = ['red', 'green', 'blue'];

describe('toEnum', () => {
  describe('valid conversions', () => {
    it('"red" in COLORS → "red"', () => expect(toEnum('red', COLORS)).toBe('red'));
    it('"blue" in COLORS → "blue"', () => expect(toEnum('blue', COLORS)).toBe('blue'));
    it('number 1 in ["1","2","3"] → 1', () => expect(toEnum(1, ['1', '2', '3'])).toBe(1));
    it('true in ["true","false"] → true', () => expect(toEnum(true, ['true', 'false'])).toBe(true));
  });

  describe('invalid values throw ConvertError', () => {
    it('"yellow" not in COLORS throws', () =>
      expect(() => toEnum('yellow', COLORS)).toThrow(ConvertError));
    it('"RED" (wrong case) throws', () =>
      expect(() => toEnum('RED', COLORS)).toThrow(ConvertError));
    it('null throws', () => expect(() => toEnum(null, COLORS)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toEnum(undefined, COLORS)).toThrow(ConvertError));
    it('empty options throws', () => expect(() => toEnum('red', [])).toThrow(ConvertError));
  });
});
