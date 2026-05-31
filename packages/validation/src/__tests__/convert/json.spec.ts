import { describe, expect, it } from '@jest/globals';
import { toJson, ConvertError } from '../../convert';

describe('toJson', () => {
  describe('plain object → returned as-is (same reference)', () => {
    it('plain object {name, age} → same reference', () => {
      const o = { name: 'John', age: 30 };
      expect(toJson(o)).toBe(o);
    });
    it('single-key object {a:1} → same reference', () => {
      const o = { a: 1 };
      expect(toJson(o)).toBe(o);
    });
    it('nested object → same reference', () => {
      const o = { a: { b: { c: 1 } } };
      expect(toJson(o)).toBe(o);
    });
    it('object with array value → same reference', () => {
      const o = { items: [1, 2, 3] };
      expect(toJson(o)).toBe(o);
    });
    it('object with null value → same reference', () => {
      const o = { key: null };
      expect(toJson(o)).toBe(o);
    });
    it('object with undefined value → same reference', () => {
      const o = { key: undefined };
      expect(toJson(o)).toBe(o);
    });
    it('object with boolean value → same reference', () => {
      const o = { active: true };
      expect(toJson(o)).toBe(o);
    });
    it('object with numeric string key → same reference', () => {
      const o = { 1: 'x', 2: 'y' };
      expect(toJson(o)).toBe(o);
    });
    it('object with many keys → same reference', () => {
      const o: Record<string, number> = {};
      for (let i = 0; i < 100; i++) o[`k${i}`] = i;
      expect(toJson(o)).toBe(o);
    });
    it('object with boolean-string-number values → same reference', () => {
      const o = { n: 42, s: 'hello', b: true };
      expect(toJson(o)).toBe(o);
    });
    it('object with deeply nested structure → same reference', () => {
      const o = { a: { b: { c: { d: { e: 'deep' } } } } };
      expect(toJson(o)).toBe(o);
    });
  });

  describe('JSON string → parsed object', () => {
    it('"{name, age}" → parsed', () => {
      expect(toJson('{"name":"John","age":30}')).toEqual({ name: 'John', age: 30 });
    });
    it('"{a:1}" single key → parsed', () => {
      expect(toJson('{"a":1}')).toEqual({ a: 1 });
    });
    it('nested JSON string → parsed', () => {
      expect(toJson('{"a":{"b":1}}')).toEqual({ a: { b: 1 } });
    });
    it('object with array value as string → parsed', () => {
      expect(toJson('{"items":[1,2,3]}')).toEqual({ items: [1, 2, 3] });
    });
    it('JSON with string values → parsed', () => {
      expect(toJson('{"x":"hello","y":"world"}')).toEqual({ x: 'hello', y: 'world' });
    });
    it('JSON with boolean values → parsed', () => {
      expect(toJson('{"active":true,"deleted":false}')).toEqual({ active: true, deleted: false });
    });
    it('JSON with null value → parsed', () => {
      expect(toJson('{"key":null}')).toEqual({ key: null });
    });
    it('JSON with numeric keys (as string keys in JSON) → parsed', () => {
      expect(toJson('{"1":"a","2":"b"}')).toEqual({ 1: 'a', 2: 'b' });
    });
    it('JSON with many keys → parsed', () => {
      const keys = Array.from({ length: 50 }, (_, i) => `"k${i}":${i}`).join(',');
      const result = toJson(`{${keys}}`);
      expect(result['k0']).toBe(0);
      expect(result['k49']).toBe(49);
    });
    it('JSON with deeply nested string → parsed', () => {
      const result = toJson('{"a":{"b":{"c":"deep"}}}');
      expect((result.a as { b: { c: string } }).b.c).toBe('deep');
    });
    it('JSON with whitespace formatting → parsed', () => {
      expect(toJson('{\n  "x": 1,\n  "y": 2\n}')).toEqual({ x: 1, y: 2 });
    });
    it('JSON with unicode values → parsed', () => {
      expect(toJson('{"greeting":"héllo"}')).toEqual({ greeting: 'héllo' });
    });
    it('JSON with escaped characters → parsed', () => {
      expect(toJson('{"path":"C:\\\\Users\\\\foo"}')).toEqual({ path: 'C:\\Users\\foo' });
    });
  });

  describe('empty object throws ConvertError (zero keys)', () => {
    it('empty plain object {} throws', () => expect(() => toJson({})).toThrow(ConvertError));
    it('JSON string "{}" throws', () => expect(() => toJson('{}')).toThrow(ConvertError));
    it('Date instance throws (no enumerable own props)', () => expect(() => toJson(new Date('2024-01-01'))).toThrow(ConvertError));
  });

  describe('array input throws ConvertError', () => {
    it('plain array [] throws', () => expect(() => toJson([])).toThrow(ConvertError));
    it('non-empty array [1,2,3] throws', () => expect(() => toJson([1, 2, 3])).toThrow(ConvertError));
    it('array of objects [{a:1}] throws', () => expect(() => toJson([{ a: 1 }])).toThrow(ConvertError));
    it('JSON array string "[1,2,3]" throws', () => expect(() => toJson('[1,2,3]')).toThrow(ConvertError));
    it('JSON array-of-objects string \'[{"a":1}]\' throws', () => expect(() => toJson('[{"a":1}]')).toThrow(ConvertError));
    it('JSON empty array string "[]" throws', () => expect(() => toJson('[]')).toThrow(ConvertError));
  });

  describe('primitive types throw ConvertError', () => {
    it('null throws', () => expect(() => toJson(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toJson(undefined)).toThrow(ConvertError));
    it('number 42 throws', () => expect(() => toJson(42)).toThrow(ConvertError));
    it('number 0 throws', () => expect(() => toJson(0)).toThrow(ConvertError));
    it('boolean true throws', () => expect(() => toJson(true)).toThrow(ConvertError));
    it('boolean false throws', () => expect(() => toJson(false)).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toJson(Symbol('x'))).toThrow(ConvertError));
    it('function throws', () => expect(() => toJson(() => {})).toThrow(ConvertError));
  });

  describe('invalid JSON strings throw ConvertError', () => {
    it('plain string "hello" throws', () => expect(() => toJson('hello')).toThrow(ConvertError));
    it('"" empty string throws', () => expect(() => toJson('')).toThrow(ConvertError));
    it('" " only spaces throws', () => expect(() => toJson(' ')).toThrow(ConvertError));
    it('"null" JSON null string throws', () => expect(() => toJson('null')).toThrow(ConvertError));
    it('"true" JSON boolean string throws', () => expect(() => toJson('true')).toThrow(ConvertError));
    it('"false" JSON boolean string throws', () => expect(() => toJson('false')).toThrow(ConvertError));
    it('"42" JSON number string throws', () => expect(() => toJson('42')).toThrow(ConvertError));
    it('"3.14" JSON float string throws', () => expect(() => toJson('3.14')).toThrow(ConvertError));
    it('"\\"hello\\"" JSON string value throws', () => expect(() => toJson('"hello"')).toThrow(ConvertError));
    it('"{" incomplete JSON throws', () => expect(() => toJson('{')).toThrow(ConvertError));
    it('"}" invalid JSON throws', () => expect(() => toJson('}')).toThrow(ConvertError));
    it('"{a:1}" unquoted key throws', () => expect(() => toJson('{a:1}')).toThrow(ConvertError));
    it('"undefined" string throws', () => expect(() => toJson('undefined')).toThrow(ConvertError));
    it('"NaN" string throws', () => expect(() => toJson('NaN')).toThrow(ConvertError));
    it('"Infinity" string throws', () => expect(() => toJson('Infinity')).toThrow(ConvertError));
    it('"{}" empty JSON object string throws (zero keys)', () => expect(() => toJson('{}')).toThrow(ConvertError));
  });

  describe('error message content', () => {
    it('string error message says "Cannot convert string to JSON object"', () => {
      expect(() => toJson('hello')).toThrow(/Cannot convert string to JSON object/);
    });
    it('null error mentions "null"', () => expect(() => toJson(null)).toThrow(/null/));
    it('number error mentions "number"', () => expect(() => toJson(42)).toThrow(/number/));
    it('boolean error mentions "boolean"', () => expect(() => toJson(true)).toThrow(/boolean/));
    it('array error mentions type', () => expect(() => toJson([])).toThrow(/object/));
  });

  describe('result is always a non-empty object', () => {
    it('result has at least one key for valid object input', () => {
      expect(Object.keys(toJson({ a: 1 })).length).toBeGreaterThan(0);
    });
    it('result is not an array', () => {
      expect(Array.isArray(toJson({ a: 1 }))).toBe(false);
    });
    it('result is not null', () => {
      expect(toJson({ a: 1 })).not.toBeNull();
    });
    it('result has typeof "object"', () => {
      expect(typeof toJson({ a: 1 })).toBe('object');
    });
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toJson(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws', () => expect(() => toJson(BigInt(1))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toJson(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError (no own enumerable keys)', () => {
    it('Promise.resolve({a:1}) throws', () => expect(() => toJson(Promise.resolve({ a: 1 }))).toThrow(ConvertError));
    it('new Promise(() => {}) throws', () => expect(() => toJson(new Promise(() => {}))).toThrow(ConvertError));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toJson(() => ({}))).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toJson(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toJson(async () => ({}))).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toJson(function* () { yield {}; })).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield { a: 1 }; }
      expect(() => toJson(gen())).toThrow(ConvertError);
    });
    it('function error mentions "function" type', () => expect(() => toJson(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError (no own enumerable keys)', () => {
    it('/abc/ throws', () => expect(() => toJson(/abc/)).toThrow(ConvertError));
    it('new RegExp("x") throws', () => expect(() => toJson(new RegExp('x'))).toThrow(ConvertError));
  });

  describe('Map / Set throw ConvertError (no own enumerable keys)', () => {
    it('empty Map throws', () => expect(() => toJson(new Map())).toThrow(ConvertError));
    it('Map with entries throws (entries are not own enumerable props)', () => expect(() => toJson(new Map([['a', 1]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toJson(new Set())).toThrow(ConvertError));
    it('Set with values throws', () => expect(() => toJson(new Set([1, 2, 3]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toJson(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toJson(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError (message is non-enumerable)', () => {
    it('new Error("x") throws', () => expect(() => toJson(new Error('x'))).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toJson(new TypeError('x'))).toThrow(ConvertError));
    it('new RangeError throws', () => expect(() => toJson(new RangeError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays — interesting behavior', () => {
    it('empty Uint8Array throws (no own keys → 0 length)', () => expect(() => toJson(new Uint8Array())).toThrow(ConvertError));
    it('Uint8Array with data → valid (numeric indices are own enumerable keys)', () => {
      // Uint8Array([1,2,3]) has Object.keys → ['0','1','2'], length 3 → passes as Record
      const result = toJson(new Uint8Array([10, 20, 30]));
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
    it('Int32Array with data → valid (same reason)', () => {
      const result = toJson(new Int32Array([1, 2]));
      expect(result).toBeDefined();
    });
    it('ArrayBuffer throws (no own enumerable keys)', () => expect(() => toJson(new ArrayBuffer(8))).toThrow(ConvertError));
  });

  describe('class instances — behavior depends on enumerable own properties', () => {
    it('class with no own enumerable props throws', () => {
      class Empty {}
      expect(() => toJson(new Empty())).toThrow(ConvertError);
    });
    it('class with own enumerable props → valid (same reference returned)', () => {
      class Person { constructor(public name: string, public age: number) {} }
      const p = new Person('Alice', 30);
      const result = toJson(p);
      expect(result).toBe(p as unknown as Record<string, unknown>);
      expect(result['name']).toBe('Alice');
    });
    it('class with single prop → valid', () => {
      class Box { constructor(public value: number) {} }
      const b = new Box(42);
      expect(toJson(b)['value']).toBe(42);
    });
    it('Object.create(null) with a prop → valid', () => {
      const o = Object.create(null) as Record<string, unknown>;
      o.x = 1;
      expect(toJson(o)['x']).toBe(1);
    });
    it('Object.create(null) with no props → throws', () => {
      expect(() => toJson(Object.create(null))).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws', () => expect(() => toJson(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toJson(Symbol())).toThrow(ConvertError));
    it('Symbol error mentions type', () => expect(() => toJson(Symbol('x'))).toThrow(/symbol/));
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    // Any string input (valid or invalid JSON) → hardcoded message
    it('"hello" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('hello'))).toBe('Cannot convert string to JSON object'));
    it('"" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson(''))).toBe('Cannot convert string to JSON object'));
    it('"null" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('null'))).toBe('Cannot convert string to JSON object'));
    it('"true" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('true'))).toBe('Cannot convert string to JSON object'));
    it('"42" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('42'))).toBe('Cannot convert string to JSON object'));
    it('"[]" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('[]'))).toBe('Cannot convert string to JSON object'));
    it('"{}" → "Cannot convert string to JSON object" (empty object has 0 keys)', () =>
      expect(getMsg(() => toJson('{}'))).toBe('Cannot convert string to JSON object'));
    it('"[1,2,3]" → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('[1,2,3]'))).toBe('Cannot convert string to JSON object'));
    it('"{" (invalid JSON) → "Cannot convert string to JSON object"', () =>
      expect(getMsg(() => toJson('{'))).toBe('Cannot convert string to JSON object'));

    // null → special case uses 'null' string not typeof
    it('null → "Cannot convert null to JSON object"', () =>
      expect(getMsg(() => toJson(null))).toBe('Cannot convert null to JSON object'));

    // Other non-object types → Cannot convert ${typeof v} to JSON object
    it('undefined → "Cannot convert undefined to JSON object"', () =>
      expect(getMsg(() => toJson(undefined))).toBe('Cannot convert undefined to JSON object'));
    it('42 → "Cannot convert number to JSON object"', () =>
      expect(getMsg(() => toJson(42))).toBe('Cannot convert number to JSON object'));
    it('0 → "Cannot convert number to JSON object"', () =>
      expect(getMsg(() => toJson(0))).toBe('Cannot convert number to JSON object'));
    it('true → "Cannot convert boolean to JSON object"', () =>
      expect(getMsg(() => toJson(true))).toBe('Cannot convert boolean to JSON object'));
    it('false → "Cannot convert boolean to JSON object"', () =>
      expect(getMsg(() => toJson(false))).toBe('Cannot convert boolean to JSON object'));

    // Arrays and empty objects → typeof is 'object'
    it('[] → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson([]))).toBe('Cannot convert object to JSON object'));
    it('[1,2,3] → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson([1, 2, 3]))).toBe('Cannot convert object to JSON object'));
    it('{} → "Cannot convert object to JSON object" (0 keys)', () =>
      expect(getMsg(() => toJson({}))).toBe('Cannot convert object to JSON object'));

    // Exotic types
    it('() => {} → "Cannot convert function to JSON object"', () =>
      expect(getMsg(() => toJson(() => {}))).toBe('Cannot convert function to JSON object'));
    it('Symbol("x") → "Cannot convert symbol to JSON object"', () =>
      expect(getMsg(() => toJson(Symbol('x')))).toBe('Cannot convert symbol to JSON object'));
    it('BigInt(1) → "Cannot convert bigint to JSON object"', () =>
      expect(getMsg(() => toJson(BigInt(1)))).toBe('Cannot convert bigint to JSON object'));
    it('new Map() → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson(new Map()))).toBe('Cannot convert object to JSON object'));
    it('new Set() → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson(new Set()))).toBe('Cannot convert object to JSON object'));
    it('new Error("x") → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson(new Error('x')))).toBe('Cannot convert object to JSON object'));
    it('new Promise(() => {}) → "Cannot convert object to JSON object"', () =>
      expect(getMsg(() => toJson(new Promise(() => {})))).toBe('Cannot convert object to JSON object'));
  });
});
