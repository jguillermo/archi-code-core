import { describe, expect, it } from '@jest/globals';
import { toInteger, ConvertError } from '../../convert';

describe('toInteger', () => {
  describe('number → integer (same value)', () => {
    it('0 → 0', () => expect(toInteger(0)).toBe(0));
    it('-0 → 0 (negative zero is still integer 0)', () => expect(toInteger(-0)).toBe(-0));
    it('42 → 42', () => expect(toInteger(42)).toBe(42));
    it('-7 → -7', () => expect(toInteger(-7)).toBe(-7));
    it('1 → 1', () => expect(toInteger(1)).toBe(1));
    it('-1 → -1', () => expect(toInteger(-1)).toBe(-1));
    it('100 → 100', () => expect(toInteger(100)).toBe(100));
    it('-100 → -100', () => expect(toInteger(-100)).toBe(-100));
    it('1.0 → 1 (float that is integer-valued)', () => expect(toInteger(1.0)).toBe(1));
    it('-1.0 → -1 (negative float integer-valued)', () => expect(toInteger(-1.0)).toBe(-1));
    it('0.0 → 0', () => expect(toInteger(0.0)).toBe(0));
    it('Number.MAX_SAFE_INTEGER → MAX_SAFE_INTEGER', () => expect(toInteger(Number.MAX_SAFE_INTEGER)).toBe(9007199254740991));
    it('Number.MIN_SAFE_INTEGER → MIN_SAFE_INTEGER', () => expect(toInteger(Number.MIN_SAFE_INTEGER)).toBe(-9007199254740991));
    it('1000000 → 1000000', () => expect(toInteger(1000000)).toBe(1000000));
    it('-9999999 → -9999999', () => expect(toInteger(-9999999)).toBe(-9999999));
  });

  describe('string → integer', () => {
    it('"42" → 42', () => expect(toInteger('42')).toBe(42));
    it('"-7" → -7', () => expect(toInteger('-7')).toBe(-7));
    it('"0" → 0', () => expect(toInteger('0')).toBe(0));
    it('"-0" → -0 (parseInt preserves negative zero)', () => expect(Object.is(toInteger('-0'), -0)).toBe(true));
    it('"  10  " → 10 (leading/trailing spaces)', () => expect(toInteger('  10  ')).toBe(10));
    it('" -100 " → -100', () => expect(toInteger(' -100 ')).toBe(-100));
    it('"1" → 1', () => expect(toInteger('1')).toBe(1));
    it('"-1" → -1', () => expect(toInteger('-1')).toBe(-1));
    it('"007" → 7 (leading zeros parsed as decimal)', () => expect(toInteger('007')).toBe(7));
    it('"000" → 0', () => expect(toInteger('000')).toBe(0));
    it('"100" → 100', () => expect(toInteger('100')).toBe(100));
    it('"9007199254740991" → MAX_SAFE_INTEGER', () => expect(toInteger('9007199254740991')).toBe(9007199254740991));
    it('"-9007199254740991" → MIN_SAFE_INTEGER', () => expect(toInteger('-9007199254740991')).toBe(-9007199254740991));
    it('"999999999" → 999999999', () => expect(toInteger('999999999')).toBe(999999999));
    it('"-999999999" → -999999999', () => expect(toInteger('-999999999')).toBe(-999999999));
    it('"  0  " → 0', () => expect(toInteger('  0  ')).toBe(0));
    it('"  -0  " → -0 (parseInt preserves negative zero after trim)', () => expect(Object.is(toInteger('  -0  '), -0)).toBe(true));
    it('"  007  " → 7', () => expect(toInteger('  007  ')).toBe(7));
  });

  describe('invalid number values throw ConvertError', () => {
    it('3.14 throws (float)', () => expect(() => toInteger(3.14)).toThrow(ConvertError));
    it('-3.14 throws (negative float)', () => expect(() => toInteger(-3.14)).toThrow(ConvertError));
    it('0.5 throws', () => expect(() => toInteger(0.5)).toThrow(ConvertError));
    it('-0.5 throws', () => expect(() => toInteger(-0.5)).toThrow(ConvertError));
    it('1.1 throws', () => expect(() => toInteger(1.1)).toThrow(ConvertError));
    it('1.9999 throws', () => expect(() => toInteger(1.9999)).toThrow(ConvertError));
    it('NaN throws', () => expect(() => toInteger(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toInteger(Infinity)).toThrow(ConvertError));
    it('-Infinity throws', () => expect(() => toInteger(-Infinity)).toThrow(ConvertError));
    it('Number.EPSILON throws', () => expect(() => toInteger(Number.EPSILON)).toThrow(ConvertError));
  });

  describe('invalid string values throw ConvertError', () => {
    it('"3.14" throws (decimal string)', () => expect(() => toInteger('3.14')).toThrow(ConvertError));
    it('"abc" throws', () => expect(() => toInteger('abc')).toThrow(ConvertError));
    it('"1.0" throws (decimal point)', () => expect(() => toInteger('1.0')).toThrow(ConvertError));
    it('"+42" throws (explicit plus sign)', () => expect(() => toInteger('+42')).toThrow(ConvertError));
    it('"1e5" throws (scientific notation)', () => expect(() => toInteger('1e5')).toThrow(ConvertError));
    it('"0xFF" throws (hex string)', () => expect(() => toInteger('0xFF')).toThrow(ConvertError));
    it('"0x10" throws (hex string)', () => expect(() => toInteger('0x10')).toThrow(ConvertError));
    it('"1 2" throws (space inside digits)', () => expect(() => toInteger('1 2')).toThrow(ConvertError));
    it('"" throws (empty string)', () => expect(() => toInteger('')).toThrow(ConvertError));
    it('" " throws (only spaces)', () => expect(() => toInteger(' ')).toThrow(ConvertError));
    it('"   " throws (multiple spaces)', () => expect(() => toInteger('   ')).toThrow(ConvertError));
    it('"1,000" throws (thousand separator)', () => expect(() => toInteger('1,000')).toThrow(ConvertError));
    it('"1.000" throws (decimal comma)', () => expect(() => toInteger('1.000')).toThrow(ConvertError));
    it('"--1" throws (double negative)', () => expect(() => toInteger('--1')).toThrow(ConvertError));
    it('"1-" throws (trailing minus)', () => expect(() => toInteger('1-')).toThrow(ConvertError));
    it('"NaN" throws', () => expect(() => toInteger('NaN')).toThrow(ConvertError));
    it('"Infinity" throws', () => expect(() => toInteger('Infinity')).toThrow(ConvertError));
    it('"null" throws', () => expect(() => toInteger('null')).toThrow(ConvertError));
    it('"true" throws', () => expect(() => toInteger('true')).toThrow(ConvertError));
    it('"12.345" throws', () => expect(() => toInteger('12.345')).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('true throws', () => expect(() => toInteger(true)).toThrow(ConvertError));
    it('false throws', () => expect(() => toInteger(false)).toThrow(ConvertError));
    it('null throws', () => expect(() => toInteger(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toInteger(undefined)).toThrow(ConvertError));
    it('plain object {} throws', () => expect(() => toInteger({})).toThrow(ConvertError));
    it('array [] throws', () => expect(() => toInteger([])).toThrow(ConvertError));
    it('array [42] throws', () => expect(() => toInteger([42])).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toInteger(new Date())).toThrow(ConvertError));
    it('function throws', () => expect(() => toInteger(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toInteger(Symbol('x'))).toThrow(ConvertError));
    it('class instance throws', () => {
      class Foo {}
      expect(() => toInteger(new Foo())).toThrow(ConvertError);
    });
  });

  describe('error message content', () => {
    it('float error message mentions the value', () => expect(() => toInteger(3.14)).toThrow(/3\.14/));
    it('string error message mentions the value', () => expect(() => toInteger('abc')).toThrow(/abc/));
    it('NaN error message mentions NaN', () => expect(() => toInteger(NaN)).toThrow(/NaN/));
    it('Infinity error message mentions Infinity', () => expect(() => toInteger(Infinity)).toThrow(/Infinity/));
    it('type error mentions type name', () => expect(() => toInteger(true)).toThrow(/boolean/));
    it('null error mentions type', () => expect(() => toInteger(null)).toThrow(/object/));
  });

  describe('result is always a safe integer', () => {
    it('typeof result is number for valid inputs', () => expect(typeof toInteger(1)).toBe('number'));
    it('result is integer-valued (no decimal part)', () => {
      const r = toInteger(42);
      expect(Number.isInteger(r)).toBe(true);
    });
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toInteger(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws', () => expect(() => toInteger(BigInt(1))).toThrow(ConvertError));
    it('BigInt(42) throws', () => expect(() => toInteger(BigInt(42))).toThrow(ConvertError));
    it('BigInt(-100) throws', () => expect(() => toInteger(BigInt(-100))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toInteger(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve(42) throws', () => expect(() => toInteger(Promise.resolve(42))).toThrow(ConvertError));
    it('Promise.resolve("42") throws', () => expect(() => toInteger(Promise.resolve('42'))).toThrow(ConvertError));
    it('new Promise(() => {}) throws', () => expect(() => toInteger(new Promise(() => {}))).toThrow(ConvertError));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toInteger(() => 42)).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toInteger(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toInteger(async () => 42)).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toInteger(function* () { yield 1; })).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield 1; }
      expect(() => toInteger(gen())).toThrow(ConvertError);
    });
    it('function error mentions "function" type', () => expect(() => toInteger(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/\\d+/ throws', () => expect(() => toInteger(/\d+/)).toThrow(ConvertError));
    it('new RegExp("\\\\d+") throws', () => expect(() => toInteger(new RegExp('\\d+'))).toThrow(ConvertError));
  });

  describe('Map / Set / WeakMap / WeakSet throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toInteger(new Map())).toThrow(ConvertError));
    it('Map with numeric entries throws', () => expect(() => toInteger(new Map([[1, 2]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toInteger(new Set())).toThrow(ConvertError));
    it('Set([42]) throws', () => expect(() => toInteger(new Set([42]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toInteger(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toInteger(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toInteger(new Error('x'))).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toInteger(new TypeError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays and buffers throw ConvertError', () => {
    it('Uint8Array([42]) throws', () => expect(() => toInteger(new Uint8Array([42]))).toThrow(ConvertError));
    it('Int32Array([1]) throws', () => expect(() => toInteger(new Int32Array([1]))).toThrow(ConvertError));
    it('Float64Array([1.0]) throws', () => expect(() => toInteger(new Float64Array([1.0]))).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toInteger(new ArrayBuffer(4))).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toInteger(new Empty())).toThrow(ConvertError);
    });
    it('class with numeric prop throws', () => {
      class Box { constructor(public value: number) {} }
      expect(() => toInteger(new Box(42))).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws', () => expect(() => toInteger(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toInteger(Symbol())).toThrow(ConvertError));
    it('Symbol.for("key") throws', () => expect(() => toInteger(Symbol.for('key'))).toThrow(ConvertError));
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    // number branch: Cannot convert ${v} to integer
    it('NaN → "Cannot convert NaN to integer"', () =>
      expect(getMsg(() => toInteger(NaN))).toBe('Cannot convert NaN to integer'));
    it('Infinity → "Cannot convert Infinity to integer"', () =>
      expect(getMsg(() => toInteger(Infinity))).toBe('Cannot convert Infinity to integer'));
    it('-Infinity → "Cannot convert -Infinity to integer"', () =>
      expect(getMsg(() => toInteger(-Infinity))).toBe('Cannot convert -Infinity to integer'));
    it('3.14 → "Cannot convert 3.14 to integer"', () =>
      expect(getMsg(() => toInteger(3.14))).toBe('Cannot convert 3.14 to integer'));
    it('-3.14 → "Cannot convert -3.14 to integer"', () =>
      expect(getMsg(() => toInteger(-3.14))).toBe('Cannot convert -3.14 to integer'));
    it('0.5 → "Cannot convert 0.5 to integer"', () =>
      expect(getMsg(() => toInteger(0.5))).toBe('Cannot convert 0.5 to integer'));

    // string branch: Cannot convert "${v}" to integer  (uses original v, not trimmed)
    it('"abc" → \'Cannot convert "abc" to integer\'', () =>
      expect(getMsg(() => toInteger('abc'))).toBe('Cannot convert "abc" to integer'));
    it('"3.14" → \'Cannot convert "3.14" to integer\'', () =>
      expect(getMsg(() => toInteger('3.14'))).toBe('Cannot convert "3.14" to integer'));
    it('"" → \'Cannot convert "" to integer\'', () =>
      expect(getMsg(() => toInteger(''))).toBe('Cannot convert "" to integer'));
    it('" " → \'Cannot convert " " to integer\' (original string, not trimmed)', () =>
      expect(getMsg(() => toInteger(' '))).toBe('Cannot convert " " to integer'));
    it('"  abc  " → message uses original with spaces', () =>
      expect(getMsg(() => toInteger('  abc  '))).toBe('Cannot convert "  abc  " to integer'));
    it('"+42" → \'Cannot convert "+42" to integer\'', () =>
      expect(getMsg(() => toInteger('+42'))).toBe('Cannot convert "+42" to integer'));
    it('"1e5" → \'Cannot convert "1e5" to integer\'', () =>
      expect(getMsg(() => toInteger('1e5'))).toBe('Cannot convert "1e5" to integer'));
    it('"0xFF" → \'Cannot convert "0xFF" to integer\'', () =>
      expect(getMsg(() => toInteger('0xFF'))).toBe('Cannot convert "0xFF" to integer'));

    // other types branch: Cannot convert ${typeof v} to integer
    it('true → "Cannot convert boolean to integer"', () =>
      expect(getMsg(() => toInteger(true))).toBe('Cannot convert boolean to integer'));
    it('false → "Cannot convert boolean to integer"', () =>
      expect(getMsg(() => toInteger(false))).toBe('Cannot convert boolean to integer'));
    it('null → "Cannot convert object to integer" (typeof null === "object")', () =>
      expect(getMsg(() => toInteger(null))).toBe('Cannot convert object to integer'));
    it('undefined → "Cannot convert undefined to integer"', () =>
      expect(getMsg(() => toInteger(undefined))).toBe('Cannot convert undefined to integer'));
    it('{} → "Cannot convert object to integer"', () =>
      expect(getMsg(() => toInteger({}))).toBe('Cannot convert object to integer'));
    it('[] → "Cannot convert object to integer"', () =>
      expect(getMsg(() => toInteger([]))).toBe('Cannot convert object to integer'));
    it('() => {} → "Cannot convert function to integer"', () =>
      expect(getMsg(() => toInteger(() => {}))).toBe('Cannot convert function to integer'));
    it('Symbol("x") → "Cannot convert symbol to integer"', () =>
      expect(getMsg(() => toInteger(Symbol('x')))).toBe('Cannot convert symbol to integer'));
    it('BigInt(1) → "Cannot convert bigint to integer"', () =>
      expect(getMsg(() => toInteger(BigInt(1)))).toBe('Cannot convert bigint to integer'));
    it('new Map() → "Cannot convert object to integer"', () =>
      expect(getMsg(() => toInteger(new Map()))).toBe('Cannot convert object to integer'));
    it('new Date() → "Cannot convert object to integer"', () =>
      expect(getMsg(() => toInteger(new Date()))).toBe('Cannot convert object to integer'));
    it('new Promise(() => {}) → "Cannot convert object to integer"', () =>
      expect(getMsg(() => toInteger(new Promise(() => {})))).toBe('Cannot convert object to integer'));
  });
});
