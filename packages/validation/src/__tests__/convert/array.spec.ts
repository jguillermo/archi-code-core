import { describe, expect, it } from '@jest/globals';
import { toArray, ConvertError } from '../../convert';

describe('toArray', () => {
  describe('array → array (same reference)', () => {
    it('non-empty array → same reference', () => {
      const a = [1, 2, 3];
      expect(toArray(a)).toBe(a);
    });
    it('empty array → same reference', () => {
      const a: unknown[] = [];
      expect(toArray(a)).toBe(a);
    });
    it('string array → same reference', () => {
      const a = ['a', 'b', 'c'];
      expect(toArray(a)).toBe(a);
    });
    it('boolean array → same reference', () => {
      const a = [true, false, true];
      expect(toArray(a)).toBe(a);
    });
    it('null-containing array → same reference', () => {
      const a = [null, null, null];
      expect(toArray(a)).toBe(a);
    });
    it('undefined-containing array → same reference', () => {
      const a = [undefined, undefined];
      expect(toArray(a)).toBe(a);
    });
    it('mixed-type array → same reference', () => {
      const a = [1, 'two', true, null, { x: 1 }];
      expect(toArray(a)).toBe(a);
    });
    it('nested array → same reference', () => {
      const a = [[1, 2], [3, 4]];
      expect(toArray(a)).toBe(a);
    });
    it('array of objects → same reference', () => {
      const a = [{ a: 1 }, { b: 2 }];
      expect(toArray(a)).toBe(a);
    });
    it('array of arrays → same reference', () => {
      const a = [[], [1], [2, 3]];
      expect(toArray(a)).toBe(a);
    });
    it('very large array → same reference', () => {
      const a = Array.from({ length: 10_000 }, (_, i) => i);
      expect(toArray(a)).toBe(a);
    });
    it('single-element array → same reference', () => {
      const a = [42];
      expect(toArray(a)).toBe(a);
    });
  });

  describe('JSON array string → parsed array', () => {
    it('"[1,2,3]" → [1,2,3]', () => expect(toArray('[1,2,3]')).toEqual([1, 2, 3]));
    it('"[]" → []', () => expect(toArray('[]')).toEqual([]));
    it('"[ ]" → [] (whitespace inside)', () => expect(toArray('[ ]')).toEqual([]));
    it('\'["a","b"]\' → ["a","b"]', () => expect(toArray('["a","b"]')).toEqual(['a', 'b']));
    it('"[true,false]" → [true,false]', () => expect(toArray('[true,false]')).toEqual([true, false]));
    it('"[null,null]" → [null,null]', () => expect(toArray('[null,null]')).toEqual([null, null]));
    it('"[1.5,-2.3]" → [1.5,-2.3]', () => expect(toArray('[1.5,-2.3]')).toEqual([1.5, -2.3]));
    it('"[1,"a",true,null]" mixed → parsed', () => {
      expect(toArray('[1,"a",true,null]')).toEqual([1, 'a', true, null]);
    });
    it('\'[{"a":1}]\' → [{a:1}]', () => expect(toArray('[{"a":1}]')).toEqual([{ a: 1 }]));
    it('"[[1,2],[3,4]]" nested → [[1,2],[3,4]]', () => expect(toArray('[[1,2],[3,4]]')).toEqual([[1, 2], [3, 4]]));
    it('"[[[]]]" deeply nested → parsed', () => expect(toArray('[[[]]]')).toEqual([[[]]]));
    it('JSON with numbers of different sizes → parsed', () => {
      expect(toArray('[0,-1,100,9007199254740991]')).toEqual([0, -1, 100, 9007199254740991]);
    });
    it('JSON with unicode strings → parsed', () => {
      expect(toArray('["héllo","wörld"]')).toEqual(['héllo', 'wörld']);
    });
    it('JSON with whitespace formatting → parsed', () => {
      expect(toArray('[\n  1,\n  2,\n  3\n]')).toEqual([1, 2, 3]);
    });
    it('JSON array with escaped characters → parsed', () => {
      expect(toArray('["C:\\\\Users\\\\foo"]')).toEqual(['C:\\Users\\foo']);
    });
    it('JSON array with objects → parsed', () => {
      expect(toArray('[{"x":1},{"y":2}]')).toEqual([{ x: 1 }, { y: 2 }]);
    });
    it('JSON array with 100 elements → parsed', () => {
      const input = `[${Array.from({ length: 100 }, (_, i) => i).join(',')}]`;
      const result = toArray(input);
      expect(result).toHaveLength(100);
      expect(result[0]).toBe(0);
      expect(result[99]).toBe(99);
    });
  });

  describe('invalid string values throw ConvertError', () => {
    it('"hello" throws', () => expect(() => toArray('hello')).toThrow(ConvertError));
    it('"" throws (empty string)', () => expect(() => toArray('')).toThrow(ConvertError));
    it('" " throws (spaces only)', () => expect(() => toArray(' ')).toThrow(ConvertError));
    it('"{}" JSON object string throws', () => expect(() => toArray('{}')).toThrow(ConvertError));
    it('\'{"a":1}\' JSON object throws', () => expect(() => toArray('{"a":1}')).toThrow(ConvertError));
    it('"null" JSON null string throws', () => expect(() => toArray('null')).toThrow(ConvertError));
    it('"true" JSON bool string throws', () => expect(() => toArray('true')).toThrow(ConvertError));
    it('"false" JSON bool string throws', () => expect(() => toArray('false')).toThrow(ConvertError));
    it('"42" JSON number string throws', () => expect(() => toArray('42')).toThrow(ConvertError));
    it('"\\"hello\\"" JSON string value throws', () => expect(() => toArray('"hello"')).toThrow(ConvertError));
    it('"[1,2,]" invalid JSON (trailing comma) throws', () => expect(() => toArray('[1,2,]')).toThrow(ConvertError));
    it('"[" incomplete JSON throws', () => expect(() => toArray('[')).toThrow(ConvertError));
    it('"undefined" throws', () => expect(() => toArray('undefined')).toThrow(ConvertError));
    it('"NaN" throws', () => expect(() => toArray('NaN')).toThrow(ConvertError));
    it('"1,2,3" (no brackets) throws', () => expect(() => toArray('1,2,3')).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('plain object {} throws', () => expect(() => toArray({})).toThrow(ConvertError));
    it('object {a:1} throws', () => expect(() => toArray({ a: 1 })).toThrow(ConvertError));
    it('number 42 throws', () => expect(() => toArray(42)).toThrow(ConvertError));
    it('number 0 throws', () => expect(() => toArray(0)).toThrow(ConvertError));
    it('number NaN throws', () => expect(() => toArray(NaN)).toThrow(ConvertError));
    it('null throws', () => expect(() => toArray(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toArray(undefined)).toThrow(ConvertError));
    it('boolean true throws', () => expect(() => toArray(true)).toThrow(ConvertError));
    it('boolean false throws', () => expect(() => toArray(false)).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toArray(new Date())).toThrow(ConvertError));
    it('function throws', () => expect(() => toArray(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toArray(Symbol('x'))).toThrow(ConvertError));
    it('class instance throws', () => {
      class Foo {}
      expect(() => toArray(new Foo())).toThrow(ConvertError);
    });
  });

  describe('error message content', () => {
    it('invalid string quotes the value', () => expect(() => toArray('hello')).toThrow(/hello/));
    it('JSON object string error quotes the value', () => expect(() => toArray('{"a":1}')).toThrow(/\{"a":1\}/));
    it('number error mentions type', () => expect(() => toArray(42)).toThrow(/number/));
    it('null error mentions type', () => expect(() => toArray(null)).toThrow(/object/));
    it('boolean error mentions type', () => expect(() => toArray(true)).toThrow(/boolean/));
    it('object error mentions type', () => expect(() => toArray({})).toThrow(/object/));
  });

  describe('result is always an array', () => {
    it('result for array input is an array', () => expect(Array.isArray(toArray([1, 2]))).toBe(true));
    it('result for JSON string is an array', () => expect(Array.isArray(toArray('[1,2]'))).toBe(true));
    it('empty array result is an array', () => expect(Array.isArray(toArray([]))).toBe(true));
    it('parsed empty string "[]" result is an array', () => expect(Array.isArray(toArray('[]'))).toBe(true));
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toArray(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws', () => expect(() => toArray(BigInt(1))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toArray(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve([1,2,3]) throws (not itself an array)', () => {
      expect(() => toArray(Promise.resolve([1, 2, 3]))).toThrow(ConvertError);
    });
    it('new Promise(() => {}) throws', () => expect(() => toArray(new Promise(() => {}))).toThrow(ConvertError));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toArray(() => [1, 2])).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toArray(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toArray(async () => [1, 2])).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toArray(function* () { yield 1; })).toThrow(ConvertError));
    it('generator object throws (iterable but not Array)', () => {
      function* gen() { yield 1; yield 2; }
      expect(() => toArray(gen())).toThrow(ConvertError);
    });
    it('class constructor throws', () => expect(() => toArray(class Foo {})).toThrow(ConvertError));
    it('function error mentions "function" type', () => expect(() => toArray(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/abc/ throws', () => expect(() => toArray(/abc/)).toThrow(ConvertError));
    it('new RegExp("x") throws', () => expect(() => toArray(new RegExp('x'))).toThrow(ConvertError));
  });

  describe('Map / Set throw ConvertError (not arrays)', () => {
    it('empty Map throws', () => expect(() => toArray(new Map())).toThrow(ConvertError));
    it('Map with entries throws (Map is iterable but not Array)', () => expect(() => toArray(new Map([['a', 1]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toArray(new Set())).toThrow(ConvertError));
    it('Set([1,2,3]) throws (Set is iterable but not Array)', () => expect(() => toArray(new Set([1, 2, 3]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toArray(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toArray(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toArray(new Error('x'))).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toArray(new TypeError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays throw ConvertError (Array.isArray returns false for TypedArrays)', () => {
    it('Uint8Array([1,2,3]) throws', () => expect(() => toArray(new Uint8Array([1, 2, 3]))).toThrow(ConvertError));
    it('empty Uint8Array throws', () => expect(() => toArray(new Uint8Array())).toThrow(ConvertError));
    it('Int32Array throws', () => expect(() => toArray(new Int32Array([1, 2]))).toThrow(ConvertError));
    it('Float64Array throws', () => expect(() => toArray(new Float64Array([3.14]))).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toArray(new ArrayBuffer(8))).toThrow(ConvertError));
    it('TypedArray error mentions "object" type', () => expect(() => toArray(new Uint8Array([1]))).toThrow(/object/));
  });

  describe('class instances throw ConvertError', () => {
    it('class with array-like numeric props throws (not a real array)', () => {
      class ArrayLike { [0] = 'a'; [1] = 'b'; length = 2; }
      expect(() => toArray(new ArrayLike())).toThrow(ConvertError);
    });
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toArray(new Empty())).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws', () => expect(() => toArray(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toArray(Symbol())).toThrow(ConvertError));
    it('Symbol error mentions "symbol" type', () => expect(() => toArray(Symbol('x'))).toThrow(/symbol/));
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    // String branch: Cannot convert "${v}" to array  (uses original v)
    it('"hello" → \'Cannot convert "hello" to array\'', () =>
      expect(getMsg(() => toArray('hello'))).toBe('Cannot convert "hello" to array'));
    it('"" → \'Cannot convert "" to array\'', () =>
      expect(getMsg(() => toArray(''))).toBe('Cannot convert "" to array'));
    it('"null" → \'Cannot convert "null" to array\'', () =>
      expect(getMsg(() => toArray('null'))).toBe('Cannot convert "null" to array'));
    it('"true" → \'Cannot convert "true" to array\'', () =>
      expect(getMsg(() => toArray('true'))).toBe('Cannot convert "true" to array'));
    it('"42" → \'Cannot convert "42" to array\'', () =>
      expect(getMsg(() => toArray('42'))).toBe('Cannot convert "42" to array'));
    it('"{}" → \'Cannot convert "{}" to array\' (valid JSON but object, not array)', () =>
      expect(getMsg(() => toArray('{}'))).toBe('Cannot convert "{}" to array'));
    it('\'{"a":1}\' → message contains the original JSON string', () =>
      expect(getMsg(() => toArray('{"a":1}'))).toBe('Cannot convert "{"a":1}" to array'));
    it('"[1,2,]" (invalid JSON) → message contains original string', () =>
      expect(getMsg(() => toArray('[1,2,]'))).toBe('Cannot convert "[1,2,]" to array'));
    it('" hello " → message preserves spaces', () =>
      expect(getMsg(() => toArray(' hello '))).toBe('Cannot convert " hello " to array'));

    // Other types → Cannot convert ${typeof v} to array
    it('42 → "Cannot convert number to array"', () =>
      expect(getMsg(() => toArray(42))).toBe('Cannot convert number to array'));
    it('0 → "Cannot convert number to array"', () =>
      expect(getMsg(() => toArray(0))).toBe('Cannot convert number to array'));
    it('true → "Cannot convert boolean to array"', () =>
      expect(getMsg(() => toArray(true))).toBe('Cannot convert boolean to array'));
    it('false → "Cannot convert boolean to array"', () =>
      expect(getMsg(() => toArray(false))).toBe('Cannot convert boolean to array'));
    it('null → "Cannot convert object to array" (typeof null === "object")', () =>
      expect(getMsg(() => toArray(null))).toBe('Cannot convert object to array'));
    it('undefined → "Cannot convert undefined to array"', () =>
      expect(getMsg(() => toArray(undefined))).toBe('Cannot convert undefined to array'));
    it('{} → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray({}))).toBe('Cannot convert object to array'));
    it('{a:1} → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray({ a: 1 }))).toBe('Cannot convert object to array'));
    it('() => {} → "Cannot convert function to array"', () =>
      expect(getMsg(() => toArray(() => {}))).toBe('Cannot convert function to array'));
    it('Symbol("x") → "Cannot convert symbol to array"', () =>
      expect(getMsg(() => toArray(Symbol('x')))).toBe('Cannot convert symbol to array'));
    it('BigInt(1) → "Cannot convert bigint to array"', () =>
      expect(getMsg(() => toArray(BigInt(1)))).toBe('Cannot convert bigint to array'));
    it('new Map() → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Map()))).toBe('Cannot convert object to array'));
    it('new Set() → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Set()))).toBe('Cannot convert object to array'));
    it('new Uint8Array([1]) → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Uint8Array([1])))).toBe('Cannot convert object to array'));
    it('new Date() → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Date()))).toBe('Cannot convert object to array'));
    it('new Error("x") → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Error('x')))).toBe('Cannot convert object to array'));
    it('new Promise(() => {}) → "Cannot convert object to array"', () =>
      expect(getMsg(() => toArray(new Promise(() => {})))).toBe('Cannot convert object to array'));
    it('async () => {} → "Cannot convert function to array"', () =>
      expect(getMsg(() => toArray(async () => {}))).toBe('Cannot convert function to array'));
  });
});
