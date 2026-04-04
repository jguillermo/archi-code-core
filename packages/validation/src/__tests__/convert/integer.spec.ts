import { describe, expect, it } from '@jest/globals';
import { toInteger, ConvertError } from '../../convert';

describe('toInteger', () => {
  describe('valid conversions', () => {
    it('integer number → same number', () => expect(toInteger(42)).toBe(42));
    it('negative integer → same number', () => expect(toInteger(-7)).toBe(-7));
    it('zero → 0', () => expect(toInteger(0)).toBe(0));
    it('string "42" → 42', () => expect(toInteger('42')).toBe(42));
    it('string "-7" → -7', () => expect(toInteger('-7')).toBe(-7));
    it('string "  10  " → 10 (trims whitespace)', () => expect(toInteger('  10  ')).toBe(10));
  });

  describe('invalid values throw ConvertError', () => {
    it('float 3.14 throws', () => expect(() => toInteger(3.14)).toThrow(ConvertError));
    it('string "3.14" throws', () => expect(() => toInteger('3.14')).toThrow(ConvertError));
    it('NaN throws', () => expect(() => toInteger(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toInteger(Infinity)).toThrow(ConvertError));
    it('boolean true throws', () => expect(() => toInteger(true)).toThrow(ConvertError));
    it('boolean false throws', () => expect(() => toInteger(false)).toThrow(ConvertError));
    it('null throws', () => expect(() => toInteger(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toInteger(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toInteger({})).toThrow(ConvertError));
    it('string "abc" throws', () => expect(() => toInteger('abc')).toThrow(ConvertError));
  });
});
