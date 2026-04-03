import { describe, expect, it } from '@jest/globals';
import { toBoolean, ConvertError } from '../../convert';

describe('toBoolean', () => {
  describe('valid conversions', () => {
    it('true → true', () => expect(toBoolean(true)).toBe(true));
    it('false → false', () => expect(toBoolean(false)).toBe(false));
    it('1 → true', () => expect(toBoolean(1)).toBe(true));
    it('0 → false', () => expect(toBoolean(0)).toBe(false));
    it.each(['true', 'TRUE', 'True', '1'])('string "%s" → true', (s) => {
      expect(toBoolean(s)).toBe(true);
    });
    it.each(['false', 'FALSE', 'False', '0'])('string "%s" → false', (s) => {
      expect(toBoolean(s)).toBe(false);
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('number 2 throws', () => expect(() => toBoolean(2)).toThrow(ConvertError));
    it('string "maybe" throws', () => expect(() => toBoolean('maybe')).toThrow(ConvertError));
    it('string "yes" throws', () => expect(() => toBoolean('yes')).toThrow(ConvertError));
    it('null throws', () => expect(() => toBoolean(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBoolean(undefined)).toThrow(ConvertError));
    it('object throws', () => expect(() => toBoolean({})).toThrow(ConvertError));
  });
});
