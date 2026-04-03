import { describe, expect, it } from '@jest/globals';
import { toBeFloat, ConvertError } from '../../convert';

describe('toBeFloat', () => {
  describe('valid conversions', () => {
    it('float 3.14 → 3.14', () => expect(toBeFloat(3.14)).toBe(3.14));
    it('integer 42 → 42', () => expect(toBeFloat(42)).toBe(42));
    it('negative -0.5 → -0.5', () => expect(toBeFloat(-0.5)).toBe(-0.5));
    it('string "3.14" → 3.14', () => expect(toBeFloat('3.14')).toBe(3.14));
    it('string "42" → 42', () => expect(toBeFloat('42')).toBe(42));
    it('string "  -1.5  " → -1.5 (trims)', () => expect(toBeFloat('  -1.5  ')).toBe(-1.5));
  });

  describe('invalid values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toBeFloat(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toBeFloat(Infinity)).toThrow(ConvertError));
    it('string "hello" throws', () => expect(() => toBeFloat('hello')).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toBeFloat(true)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeFloat(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeFloat(undefined)).toThrow(ConvertError));
  });
});
