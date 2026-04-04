import { describe, expect, it } from '@jest/globals';
import { toJson, ConvertError } from '../../convert';

describe('toJson', () => {
  describe('valid conversions', () => {
    it('plain object → returned as-is', () => {
      const o = { name: 'John', age: 30 };
      expect(toJson(o)).toBe(o);
    });
    it('JSON string of object → parsed object', () => {
      expect(toJson('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('invalid values throw ConvertError', () => {
    it('empty object throws', () => expect(() => toJson({})).toThrow(ConvertError));
    it('array throws', () => expect(() => toJson([1, 2, 3])).toThrow(ConvertError));
    it('null throws', () => expect(() => toJson(null)).toThrow(ConvertError));
    it('number throws', () => expect(() => toJson(42)).toThrow(ConvertError));
    it('boolean throws', () => expect(() => toJson(true)).toThrow(ConvertError));
    it('JSON array string throws', () => expect(() => toJson('[1,2,3]')).toThrow(ConvertError));
    it('plain string throws', () => expect(() => toJson('hello')).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toJson(undefined)).toThrow(ConvertError));
  });
});
