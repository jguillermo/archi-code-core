import { describe, expect, it } from '@jest/globals';
import { toBeJson, ConvertError } from '../../convert';

describe('toBeJson', () => {
  describe('valid conversions', () => {
    it('plain object → returned as-is', () => {
      const o = { name: 'John', age: 30 };
      expect(toBeJson(o)).toBe(o);
    });
    it('JSON string of object → parsed object', () => {
      expect(toBeJson('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('empty object throws', () => expect(() => toBeJson({})).toThrow(ConvertError));
    it('array throws', () => expect(() => toBeJson([1, 2, 3])).toThrow(ConvertError));
    it('null throws', () => expect(() => toBeJson(null)).toThrow(ConvertError));
    it('number throws', () => expect(() => toBeJson(42)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toBeJson(true)).toThrow(ConvertError));
    it('JSON array string throws', () => expect(() => toBeJson('[1,2,3]')).toThrow(ConvertError));
    it('plain string throws', () => expect(() => toBeJson('hello')).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBeJson(undefined)).toThrow(ConvertError));
  });
});
