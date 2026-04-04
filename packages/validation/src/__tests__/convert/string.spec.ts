import { describe, expect, it } from '@jest/globals';
import { toString, ConvertError } from '../../convert';

describe('toString', () => {
  describe('valid conversions', () => {
    it('string "hello" → "hello"', () => expect(toString('hello')).toBe('hello'));
    it('number 42 → "42"', () => expect(toString(42)).toBe('42'));
    it('number 3.14 → "3.14"', () => expect(toString(3.14)).toBe('3.14'));
    it('boolean true → "true"', () => expect(toString(true)).toBe('true'));
    it('boolean false → "false"', () => expect(toString(false)).toBe('false'));
  });

  describe('invalid values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toString(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toString(Infinity)).toThrow(ConvertError));
    it('null throws', () => expect(() => toString(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toString(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toString({})).toThrow(ConvertError));
    it('array throws', () => expect(() => toString([])).toThrow(ConvertError));
  });
});
