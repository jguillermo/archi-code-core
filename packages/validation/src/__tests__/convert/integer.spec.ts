import { describe, expect, it } from '@jest/globals';
import { toBeInteger, ConvertError } from '../../convert';

describe('toBeInteger', () => {
  describe('valid conversions', () => {
    it('integer number → same number', () => expect(toBeInteger(42)).toBe(42));
    it('negative integer → same number', () => expect(toBeInteger(-7)).toBe(-7));
    it('zero → 0', () => expect(toBeInteger(0)).toBe(0));
    it('string "42" → 42', () => expect(toBeInteger('42')).toBe(42));
    it('string "-7" → -7', () => expect(toBeInteger('-7')).toBe(-7));
    it('string "  10  " → 10 (trims whitespace)', () => expect(toBeInteger('  10  ')).toBe(10));
  });

  describe('invalid values throw ConvertError', () => {
    it('float 3.14 throws', () => expect(() => toBeInteger(3.14)).toThrow(ConvertError));
    it('string "3.14" throws', () => expect(() => toBeInteger('3.14')).toThrow(ConvertError));
    it('NaN throws', () => expect(() => toBeInteger(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toBeInteger(Infinity)).toThrow(ConvertError));
    it('boolean true throws', () => expect(() => toBeInteger(true)).toThrow(ConvertError));
    it('boolean false throws', () => expect(() => toBeInteger(false)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeInteger(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeInteger(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toBeInteger({})).toThrow(ConvertError));
    it('string "abc" throws', () => expect(() => toBeInteger('abc')).toThrow(ConvertError));
  });
});
