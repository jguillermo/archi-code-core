import { describe, expect, it } from '@jest/globals';
import { toBeBoolean, ConvertError } from '../../convert';

describe('toBeBoolean', () => {
  describe('valid conversions', () => {
    it('true → true', () => expect(toBeBoolean(true)).toBe(true));
    it('false → false', () => expect(toBeBoolean(false)).toBe(false));
    it('1 → true', () => expect(toBeBoolean(1)).toBe(true));
    it('0 → false', () => expect(toBeBoolean(0)).toBe(false));
    it.each(['true', 'TRUE', 'True', '1'])('string "%s" → true', (s) => {
      expect(toBeBoolean(s)).toBe(true);
    });
    it.each(['false', 'FALSE', 'False', '0'])('string "%s" → false', (s) => {
      expect(toBeBoolean(s)).toBe(false);
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('number 2 throws', () => expect(() => toBeBoolean(2)).toThrow(ConvertError));
    it('string "maybe" throws', () => expect(() => toBeBoolean('maybe')).toThrow(ConvertError));
    it('string "yes" throws', () => expect(() => toBeBoolean('yes')).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeBoolean(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeBoolean(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toBeBoolean({})).toThrow(ConvertError));
  });
});
