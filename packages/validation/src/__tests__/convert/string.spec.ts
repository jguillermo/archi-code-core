import { describe, expect, it } from '@jest/globals';
import { toBeString, ConvertError } from '../../convert';

describe('toBeString', () => {
  describe('valid conversions', () => {
    it('string "hello" → "hello"', () => expect(toBeString('hello')).toBe('hello'));
    it('number 42 → "42"', () => expect(toBeString(42)).toBe('42'));
    it('number 3.14 → "3.14"', () => expect(toBeString(3.14)).toBe('3.14'));
    it('boolean true → "true"', () => expect(toBeString(true)).toBe('true'));
    it('boolean false → "false"', () => expect(toBeString(false)).toBe('false'));
  });

  describe('invalid values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toBeString(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toBeString(Infinity)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeString(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeString(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toBeString({})).toThrow(ConvertError));
    it('array throws', () => expect(() => toBeString([])).toThrow(ConvertError));
  });
});
