import { describe, expect, it } from '@jest/globals';
import { toBeArray, ConvertError } from '../../convert';

describe('toBeArray', () => {
  describe('valid conversions', () => {
    it('array → returned as-is', () => {
      const a = [1, 2, 3];
      expect(toBeArray(a)).toBe(a);
    });
    it('empty array → returned as-is', () => expect(toBeArray([])).toEqual([]));
    it('JSON array string → parsed array', () => expect(toBeArray('[1,2,3]')).toEqual([1, 2, 3]));
    it('empty JSON array string "[]" → []', () => expect(toBeArray('[]')).toEqual([]));
    it('JSON array with strings → parsed', () =>
      expect(toBeArray('["a","b"]')).toEqual(['a', 'b']));
  });

  describe('invalid values throw ConvertError', () => {
    it('object throws', () => expect(() => toBeArray({})).toThrow(ConvertError));
    it('JSON object string throws', () => expect(() => toBeArray('{"a":1}')).toThrow(ConvertError));
    it('plain string "hello" throws', () => expect(() => toBeArray('hello')).toThrow(ConvertError));
    it('number throws', () => expect(() => toBeArray(42)).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeArray(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeArray(undefined)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toBeArray(true)).toThrow(ConvertError));
  });
});
