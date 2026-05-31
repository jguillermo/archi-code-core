import { describe, expect, it } from '@jest/globals';
import { toString, ConvertError } from '../../convert';

describe('toString', () => {
  describe('string → string (identity)', () => {
    it('empty string "" → ""', () => expect(toString('')).toBe(''));
    it('"hello" → "hello"', () => expect(toString('hello')).toBe('hello'));
    it('"  spaces  " → "  spaces  " (preserves whitespace)', () => expect(toString('  spaces  ')).toBe('  spaces  '));
    it('single space " " → " "', () => expect(toString(' ')).toBe(' '));
    it('newline "\\n" → "\\n"', () => expect(toString('\n')).toBe('\n'));
    it('tab "\\t" → "\\t"', () => expect(toString('\t')).toBe('\t'));
    it('string "0" → "0"', () => expect(toString('0')).toBe('0'));
    it('string "false" → "false"', () => expect(toString('false')).toBe('false'));
    it('string "null" → "null"', () => expect(toString('null')).toBe('null'));
    it('string "undefined" → "undefined"', () => expect(toString('undefined')).toBe('undefined'));
    it('string with special chars → same', () => expect(toString('a@#$%^&*()')).toBe('a@#$%^&*()'));
    it('string with unicode → same', () => expect(toString('héllo wörld')).toBe('héllo wörld'));
    it('string with emoji → same', () => expect(toString('hello 🎉')).toBe('hello 🎉'));
    it('string with chinese characters → same', () => expect(toString('你好世界')).toBe('你好世界'));
    it('string with arabic → same', () => expect(toString('مرحبا')).toBe('مرحبا'));
    it('very long string → same', () => {
      const long = 'a'.repeat(10_000);
      expect(toString(long)).toBe(long);
    });
    it('string with null bytes → same', () => expect(toString('a\0b')).toBe('a\0b'));
    it('string with backslash → same', () => expect(toString('a\\b')).toBe('a\\b'));
    it('string with quotes → same', () => expect(toString('"quoted"')).toBe('"quoted"'));
  });

  describe('boolean → string', () => {
    it('true → "true"', () => expect(toString(true)).toBe('true'));
    it('false → "false"', () => expect(toString(false)).toBe('false'));
  });

  describe('number → string', () => {
    it('42 → "42"', () => expect(toString(42)).toBe('42'));
    it('0 → "0"', () => expect(toString(0)).toBe('0'));
    it('-0 → "0" (negative zero serializes as "0")', () => expect(toString(-0)).toBe('0'));
    it('-1 → "-1"', () => expect(toString(-1)).toBe('-1'));
    it('3.14 → "3.14"', () => expect(toString(3.14)).toBe('3.14'));
    it('-3.14 → "-3.14"', () => expect(toString(-3.14)).toBe('-3.14'));
    it('0.1 → "0.1"', () => expect(toString(0.1)).toBe('0.1'));
    it('1e10 → "10000000000"', () => expect(toString(1e10)).toBe('10000000000'));
    it('1.5e-7 → "1.5e-7"', () => expect(toString(1.5e-7)).toBe('1.5e-7'));
    it('Number.MAX_SAFE_INTEGER → string', () => expect(toString(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991'));
    it('Number.MIN_SAFE_INTEGER → string', () => expect(toString(Number.MIN_SAFE_INTEGER)).toBe('-9007199254740991'));
    it('Number.EPSILON → string', () => expect(toString(Number.EPSILON)).toBe(String(Number.EPSILON)));
    it('Number.MAX_VALUE → string', () => expect(toString(Number.MAX_VALUE)).toBe(String(Number.MAX_VALUE)));
    it('Number.MIN_VALUE → string', () => expect(toString(Number.MIN_VALUE)).toBe(String(Number.MIN_VALUE)));
    it('100 → "100"', () => expect(toString(100)).toBe('100'));
    it('-999999 → "-999999"', () => expect(toString(-999999)).toBe('-999999'));
    it('0.000001 → "0.000001"', () => expect(toString(0.000001)).toBe('0.000001'));
    it('1234567890.12345 → string', () => expect(toString(1234567890.12345)).toBe('1234567890.12345'));
  });

  describe('invalid values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toString(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toString(Infinity)).toThrow(ConvertError));
    it('-Infinity throws', () => expect(() => toString(-Infinity)).toThrow(ConvertError));
    it('null throws', () => expect(() => toString(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toString(undefined)).toThrow(ConvertError));
    it('plain object {} throws', () => expect(() => toString({})).toThrow(ConvertError));
    it('array [] throws', () => expect(() => toString([])).toThrow(ConvertError));
    it('array [1,2,3] throws', () => expect(() => toString([1, 2, 3])).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toString(new Date())).toThrow(ConvertError));
    it('function throws', () => expect(() => toString(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toString(Symbol('x'))).toThrow(ConvertError));
    it('class instance throws', () => {
      class Foo {}
      expect(() => toString(new Foo())).toThrow(ConvertError);
    });
    it('nested object throws', () => expect(() => toString({ a: { b: 1 } })).toThrow(ConvertError));
  });

  describe('error message content', () => {
    it('NaN error message mentions NaN', () => expect(() => toString(NaN)).toThrow(/NaN/));
    it('Infinity error message mentions Infinity', () => expect(() => toString(Infinity)).toThrow(/Infinity/));
    it('-Infinity error message mentions -Infinity', () => expect(() => toString(-Infinity)).toThrow(/-?Infinity/));
    it('null error mentions type', () => expect(() => toString(null)).toThrow(/object/));
    it('object error mentions type', () => expect(() => toString({})).toThrow(/object/));
    it('array error mentions type', () => expect(() => toString([])).toThrow(/object/));
  });

  describe('return type is always string', () => {
    it('typeof result is string for string input', () => expect(typeof toString('x')).toBe('string'));
    it('typeof result is string for number input', () => expect(typeof toString(42)).toBe('string'));
    it('typeof result is string for boolean input', () => expect(typeof toString(true)).toBe('string'));
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toString(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws', () => expect(() => toString(BigInt(1))).toThrow(ConvertError));
    it('BigInt(-1) throws', () => expect(() => toString(BigInt(-1))).toThrow(ConvertError));
    it('BigInt(9007199254740991) throws', () => expect(() => toString(BigInt(9007199254740991))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toString(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve() throws', () => expect(() => toString(Promise.resolve())).toThrow(ConvertError));
    it('Promise.resolve(42) throws', () => expect(() => toString(Promise.resolve(42))).toThrow(ConvertError));
    it('Promise.reject() throws (even a rejected promise)', () => {
      const p = Promise.reject(new Error('x'));
      p.catch(() => {});
      expect(() => toString(p)).toThrow(ConvertError);
    });
    it('new Promise(() => {}) throws', () => expect(() => toString(new Promise(() => {}))).toThrow(ConvertError));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toString(() => 'x')).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toString(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toString(async () => 'x')).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toString(function* () { yield 1; })).toThrow(ConvertError));
    it('generator object (iterator) throws', () => {
      function* gen() { yield 1; }
      expect(() => toString(gen())).toThrow(ConvertError);
    });
    it('async generator function throws', () => expect(() => toString(async function* () { yield 1; })).toThrow(ConvertError));
    it('class constructor throws', () => expect(() => toString(class Foo {})).toThrow(ConvertError));
    it('function error mentions "function" type', () => expect(() => toString(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/abc/ throws', () => expect(() => toString(/abc/)).toThrow(ConvertError));
    it('/^\\d+$/ throws', () => expect(() => toString(/^\d+$/)).toThrow(ConvertError));
    it('new RegExp("x") throws', () => expect(() => toString(new RegExp('x'))).toThrow(ConvertError));
    it('RegExp error mentions "object" type', () => expect(() => toString(/x/)).toThrow(/object/));
  });

  describe('Map / Set / WeakMap / WeakSet throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toString(new Map())).toThrow(ConvertError));
    it('Map with entries throws', () => expect(() => toString(new Map([['a', 1]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toString(new Set())).toThrow(ConvertError));
    it('Set with values throws', () => expect(() => toString(new Set([1, 2, 3]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toString(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toString(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toString(new Error('x'))).toThrow(ConvertError));
    it('new TypeError("x") throws', () => expect(() => toString(new TypeError('x'))).toThrow(ConvertError));
    it('new RangeError("x") throws', () => expect(() => toString(new RangeError('x'))).toThrow(ConvertError));
    it('new SyntaxError("x") throws', () => expect(() => toString(new SyntaxError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays and buffers throw ConvertError', () => {
    it('Uint8Array throws', () => expect(() => toString(new Uint8Array([1, 2, 3]))).toThrow(ConvertError));
    it('Int32Array throws', () => expect(() => toString(new Int32Array([1, 2]))).toThrow(ConvertError));
    it('Float64Array throws', () => expect(() => toString(new Float64Array([3.14]))).toThrow(ConvertError));
    it('empty Uint8Array throws', () => expect(() => toString(new Uint8Array())).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toString(new ArrayBuffer(8))).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toString(new Empty())).toThrow(ConvertError);
    });
    it('class with props throws', () => {
      class Person { constructor(public name: string) {} }
      expect(() => toString(new Person('Alice'))).toThrow(ConvertError);
    });
    it('class extending Error throws', () => {
      class MyError extends Error {}
      expect(() => toString(new MyError('x'))).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws', () => expect(() => toString(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() (no description) throws', () => expect(() => toString(Symbol())).toThrow(ConvertError));
    it('Symbol.for("key") throws', () => expect(() => toString(Symbol.for('key'))).toThrow(ConvertError));
    it('Symbol error mentions "symbol" type', () => expect(() => toString(Symbol('x'))).toThrow(/symbol/));
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    it('NaN → "Cannot convert NaN to string"', () =>
      expect(getMsg(() => toString(NaN))).toBe('Cannot convert NaN to string'));
    it('Infinity → "Cannot convert Infinity to string"', () =>
      expect(getMsg(() => toString(Infinity))).toBe('Cannot convert Infinity to string'));
    it('-Infinity → "Cannot convert -Infinity to string"', () =>
      expect(getMsg(() => toString(-Infinity))).toBe('Cannot convert -Infinity to string'));
    it('null → "Cannot convert object to string" (typeof null === "object")', () =>
      expect(getMsg(() => toString(null))).toBe('Cannot convert object to string'));
    it('undefined → "Cannot convert undefined to string"', () =>
      expect(getMsg(() => toString(undefined))).toBe('Cannot convert undefined to string'));
    it('{} → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString({}))).toBe('Cannot convert object to string'));
    it('[] → "Cannot convert object to string" (typeof [] === "object")', () =>
      expect(getMsg(() => toString([]))).toBe('Cannot convert object to string'));
    it('() => {} → "Cannot convert function to string"', () =>
      expect(getMsg(() => toString(() => {}))).toBe('Cannot convert function to string'));
    it('Symbol("x") → "Cannot convert symbol to string"', () =>
      expect(getMsg(() => toString(Symbol('x')))).toBe('Cannot convert symbol to string'));
    it('BigInt(1) → "Cannot convert bigint to string"', () =>
      expect(getMsg(() => toString(BigInt(1)))).toBe('Cannot convert bigint to string'));
    it('new Map() → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Map()))).toBe('Cannot convert object to string'));
    it('new Date() → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Date()))).toBe('Cannot convert object to string'));
    it('new Error("x") → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Error('x')))).toBe('Cannot convert object to string'));
    it('async () => {} → "Cannot convert function to string"', () =>
      expect(getMsg(() => toString(async () => {}))).toBe('Cannot convert function to string'));
    it('new Set() → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Set()))).toBe('Cannot convert object to string'));
    it('new Uint8Array() → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Uint8Array()))).toBe('Cannot convert object to string'));
    it('new Promise(() => {}) → "Cannot convert object to string"', () =>
      expect(getMsg(() => toString(new Promise(() => {})))).toBe('Cannot convert object to string'));
  });
});
