import { describe, expect, it } from '@jest/globals';
import { toArray, ConvertError } from '../../convert';

describe('toArray', () => {
  describe('valid conversions', () => {
    it('array → returned as-is', () => {
      const a = [1, 2, 3];
      expect(toArray(a)).toBe(a);
    });
    it('empty array → returned as-is', () => expect(toArray([])).toEqual([]));
    it('JSON array string → parsed array', () => expect(toArray('[1,2,3]')).toEqual([1, 2, 3]));
    it('empty JSON array string "[]" → []', () => expect(toArray('[]')).toEqual([]));
    it('JSON array with strings → parsed', () => expect(toArray('["a","b"]')).toEqual(['a', 'b']));
  });

  describe('invalid values throw ConvertError', () => {
    it('object throws', () => expect(() => toArray({})).toThrow(ConvertError));
    it('JSON object string throws', () => expect(() => toArray('{"a":1}')).toThrow(ConvertError));
    it('plain string "hello" throws', () => expect(() => toArray('hello')).toThrow(ConvertError));
    it('number throws', () => expect(() => toArray(42)).toThrow(ConvertError));
    it('null throws', () => expect(() => toArray(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toArray(undefined)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toArray(true)).toThrow(ConvertError));
  });
});
