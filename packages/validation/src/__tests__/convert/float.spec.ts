import { describe, expect, it } from '@jest/globals';
import { toFloat, ConvertError } from '../../convert';

describe('toFloat', () => {
  describe('valid conversions', () => {
    it('float 3.14 → 3.14', () => expect(toFloat(3.14)).toBe(3.14));
    it('integer 42 → 42', () => expect(toFloat(42)).toBe(42));
    it('negative -0.5 → -0.5', () => expect(toFloat(-0.5)).toBe(-0.5));
    it('string "3.14" → 3.14', () => expect(toFloat('3.14')).toBe(3.14));
    it('string "42" → 42', () => expect(toFloat('42')).toBe(42));
    it('string "  -1.5  " → -1.5 (trims)', () => expect(toFloat('  -1.5  ')).toBe(-1.5));
  });

  describe('invalid values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toFloat(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toFloat(Infinity)).toThrow(ConvertError));
    it('string "hello" throws', () => expect(() => toFloat('hello')).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toFloat(true)).toThrow(ConvertError));
    it('null throws', () => expect(() => toFloat(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toFloat(undefined)).toThrow(ConvertError));
  });
});
