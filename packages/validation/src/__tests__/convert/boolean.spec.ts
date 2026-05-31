import { describe, expect, it } from '@jest/globals';
import { toBoolean, ConvertError } from '../../convert';

describe('toBoolean', () => {
  describe('boolean → boolean (identity)', () => {
    it('true → true', () => expect(toBoolean(true)).toBe(true));
    it('false → false', () => expect(toBoolean(false)).toBe(false));
  });

  describe('number → boolean', () => {
    it('1 → true', () => expect(toBoolean(1)).toBe(true));
    it('0 → false', () => expect(toBoolean(0)).toBe(false));
  });

  describe('string truthy values → true', () => {
    it.each(['true', 'TRUE', 'True', 'tRuE', 'TrUe'])('"%s" → true', (s) => {
      expect(toBoolean(s)).toBe(true);
    });
    it.each(['1'])('"%s" → true', (s) => {
      expect(toBoolean(s)).toBe(true);
    });
    it('"  true  " → true (leading/trailing spaces)', () => expect(toBoolean('  true  ')).toBe(true));
    it('"  TRUE  " → true', () => expect(toBoolean('  TRUE  ')).toBe(true));
    it('"  1  " → true', () => expect(toBoolean('  1  ')).toBe(true));
    it('"	true	" → true (tabs)', () => expect(toBoolean('\ttrue\t')).toBe(true));
  });

  describe('string falsy values → false', () => {
    it.each(['false', 'FALSE', 'False', 'fAlSe', 'FaLsE'])('"%s" → false', (s) => {
      expect(toBoolean(s)).toBe(false);
    });
    it.each(['0'])('"%s" → false', (s) => {
      expect(toBoolean(s)).toBe(false);
    });
    it('"  false  " → false (leading/trailing spaces)', () => expect(toBoolean('  false  ')).toBe(false));
    it('"  FALSE  " → false', () => expect(toBoolean('  FALSE  ')).toBe(false));
    it('"  0  " → false', () => expect(toBoolean('  0  ')).toBe(false));
    it('"	false	" → false (tabs)', () => expect(toBoolean('\tfalse\t')).toBe(false));
  });

  describe('invalid number values throw ConvertError', () => {
    it('2 throws', () => expect(() => toBoolean(2)).toThrow(ConvertError));
    it('-1 throws', () => expect(() => toBoolean(-1)).toThrow(ConvertError));
    it('0.5 throws', () => expect(() => toBoolean(0.5)).toThrow(ConvertError));
    it('-0.5 throws', () => expect(() => toBoolean(-0.5)).toThrow(ConvertError));
    it('100 throws', () => expect(() => toBoolean(100)).toThrow(ConvertError));
    it('-100 throws', () => expect(() => toBoolean(-100)).toThrow(ConvertError));
    it('NaN throws', () => expect(() => toBoolean(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toBoolean(Infinity)).toThrow(ConvertError));
    it('-Infinity throws', () => expect(() => toBoolean(-Infinity)).toThrow(ConvertError));
    it('Number.EPSILON throws', () => expect(() => toBoolean(Number.EPSILON)).toThrow(ConvertError));
    it('Number.MAX_SAFE_INTEGER throws', () => expect(() => toBoolean(Number.MAX_SAFE_INTEGER)).toThrow(ConvertError));
  });

  describe('invalid string values throw ConvertError', () => {
    it('"maybe" throws', () => expect(() => toBoolean('maybe')).toThrow(ConvertError));
    it('"yes" throws', () => expect(() => toBoolean('yes')).toThrow(ConvertError));
    it('"no" throws', () => expect(() => toBoolean('no')).toThrow(ConvertError));
    it('"on" throws', () => expect(() => toBoolean('on')).toThrow(ConvertError));
    it('"off" throws', () => expect(() => toBoolean('off')).toThrow(ConvertError));
    it('"" throws (empty string)', () => expect(() => toBoolean('')).toThrow(ConvertError));
    it('" " throws (only space)', () => expect(() => toBoolean(' ')).toThrow(ConvertError));
    it('"   " throws (multiple spaces)', () => expect(() => toBoolean('   ')).toThrow(ConvertError));
    it('"null" throws', () => expect(() => toBoolean('null')).toThrow(ConvertError));
    it('"undefined" throws', () => expect(() => toBoolean('undefined')).toThrow(ConvertError));
    it('"2" throws', () => expect(() => toBoolean('2')).toThrow(ConvertError));
    it('"-1" throws', () => expect(() => toBoolean('-1')).toThrow(ConvertError));
    it('"t" throws (abbreviation)', () => expect(() => toBoolean('t')).toThrow(ConvertError));
    it('"f" throws (abbreviation)', () => expect(() => toBoolean('f')).toThrow(ConvertError));
    it('"T" throws', () => expect(() => toBoolean('T')).toThrow(ConvertError));
    it('"F" throws', () => expect(() => toBoolean('F')).toThrow(ConvertError));
    it('"10" throws', () => expect(() => toBoolean('10')).toThrow(ConvertError));
    it('"00" throws', () => expect(() => toBoolean('00')).toThrow(ConvertError));
    it('"01" throws', () => expect(() => toBoolean('01')).toThrow(ConvertError));
    it('"TRUE FALSE" throws', () => expect(() => toBoolean('TRUE FALSE')).toThrow(ConvertError));
    it('"enabled" throws', () => expect(() => toBoolean('enabled')).toThrow(ConvertError));
    it('"disabled" throws', () => expect(() => toBoolean('disabled')).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('null throws', () => expect(() => toBoolean(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toBoolean(undefined)).toThrow(ConvertError));
    it('plain object {} throws', () => expect(() => toBoolean({})).toThrow(ConvertError));
    it('empty array [] throws', () => expect(() => toBoolean([])).toThrow(ConvertError));
    it('array [true] throws', () => expect(() => toBoolean([true])).toThrow(ConvertError));
    it('array [1] throws', () => expect(() => toBoolean([1])).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toBoolean(new Date())).toThrow(ConvertError));
    it('function throws', () => expect(() => toBoolean(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toBoolean(Symbol('x'))).toThrow(ConvertError));
    it('class instance throws', () => {
      class Foo {}
      expect(() => toBoolean(new Foo())).toThrow(ConvertError);
    });
  });

  describe('error message content', () => {
    it('number 2 error includes JSON-stringified value', () => expect(() => toBoolean(2)).toThrow(/2/));
    it('"maybe" error includes the value', () => expect(() => toBoolean('maybe')).toThrow(/maybe/));
    it('null error shows null', () => expect(() => toBoolean(null)).toThrow(/null/));
    it('object error shows object representation', () => expect(() => toBoolean({})).toThrow(/{}/));
    it('array error shows array representation', () => expect(() => toBoolean([])).toThrow(/\[\]/));
  });

  describe('return type is always boolean', () => {
    it('typeof result is boolean for boolean input', () => expect(typeof toBoolean(true)).toBe('boolean'));
    it('typeof result is boolean for number 1', () => expect(typeof toBoolean(1)).toBe('boolean'));
    it('typeof result is boolean for number 0', () => expect(typeof toBoolean(0)).toBe('boolean'));
    it('typeof result is boolean for string "true"', () => expect(typeof toBoolean('true')).toBe('boolean'));
    it('typeof result is boolean for string "false"', () => expect(typeof toBoolean('false')).toBe('boolean'));
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws ConvertError', () => expect(() => toBoolean(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws ConvertError', () => expect(() => toBoolean(BigInt(1))).toThrow(ConvertError));
    it('BigInt(-1) throws ConvertError', () => expect(() => toBoolean(BigInt(-1))).toThrow(ConvertError));
    it('BigInt error message mentions "bigint" type', () => expect(() => toBoolean(BigInt(1))).toThrow(/bigint/));
    it('BigInt(42) throws ConvertError', () => expect(() => toBoolean(BigInt(42))).toThrow(ConvertError));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve(true) throws', () => expect(() => toBoolean(Promise.resolve(true))).toThrow(ConvertError));
    it('new Promise(() => {}) throws', () => expect(() => toBoolean(new Promise(() => {}))).toThrow(ConvertError));
    it('Promise error message contains "{}"', () => expect(() => toBoolean(Promise.resolve())).toThrow(/{}/));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toBoolean(() => true)).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toBoolean(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toBoolean(async () => true)).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toBoolean(function* () { yield true; })).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield true; }
      expect(() => toBoolean(gen())).toThrow(ConvertError);
    });
    // JSON.stringify(fn) returns undefined → fallback to typeof → "Cannot convert function to boolean"
    it('function error message mentions "function" type', () => expect(() => toBoolean(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/true/ throws', () => expect(() => toBoolean(/true/)).toThrow(ConvertError));
    it('new RegExp("false") throws', () => expect(() => toBoolean(new RegExp('false'))).toThrow(ConvertError));
    it('RegExp error message contains "{}"', () => expect(() => toBoolean(/x/)).toThrow(/{}/));
  });

  describe('Map / Set / WeakMap / WeakSet throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toBoolean(new Map())).toThrow(ConvertError));
    it('Map([["key", true]]) throws', () => expect(() => toBoolean(new Map([['key', true]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toBoolean(new Set())).toThrow(ConvertError));
    it('Set([true]) throws', () => expect(() => toBoolean(new Set([true]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toBoolean(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toBoolean(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toBoolean(new Error('x'))).toThrow(ConvertError));
    it('new TypeError throws', () => expect(() => toBoolean(new TypeError('x'))).toThrow(ConvertError));
    it('new RangeError throws', () => expect(() => toBoolean(new RangeError('out of range'))).toThrow(ConvertError));
  });

  describe('TypedArrays throw ConvertError', () => {
    it('Uint8Array([1]) throws', () => expect(() => toBoolean(new Uint8Array([1]))).toThrow(ConvertError));
    it('Uint8Array([0]) throws', () => expect(() => toBoolean(new Uint8Array([0]))).toThrow(ConvertError));
    it('empty Uint8Array throws', () => expect(() => toBoolean(new Uint8Array())).toThrow(ConvertError));
    it('Int32Array throws', () => expect(() => toBoolean(new Int32Array([1]))).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toBoolean(new ArrayBuffer(1))).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toBoolean(new Empty())).toThrow(ConvertError);
    });
    it('class with boolean prop throws', () => {
      class Flag { constructor(public active: boolean) {} }
      expect(() => toBoolean(new Flag(true))).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws ConvertError', () => expect(() => toBoolean(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() throws ConvertError', () => expect(() => toBoolean(Symbol())).toThrow(ConvertError));
    it('Symbol.for("key") throws ConvertError', () => expect(() => toBoolean(Symbol.for('key'))).toThrow(ConvertError));
    it('Symbol error message mentions "symbol" type', () => {
      // JSON.stringify(Symbol) returns undefined → fallback to typeof → "Cannot convert symbol to boolean"
      expect(() => toBoolean(Symbol('x'))).toThrow(/symbol/);
    });
  });

  describe('exact error message text', () => {
    function getMsg(fn: () => void): string {
      try { fn(); } catch (e) { return (e as Error).message; }
      throw new Error('Expected to throw');
    }

    // Numbers that are not 0 or 1 → JSON.stringify(n) gives the number as string
    it('2 → "Cannot convert 2 to boolean"', () =>
      expect(getMsg(() => toBoolean(2))).toBe('Cannot convert 2 to boolean'));
    it('-1 → "Cannot convert -1 to boolean"', () =>
      expect(getMsg(() => toBoolean(-1))).toBe('Cannot convert -1 to boolean'));
    it('0.5 → "Cannot convert 0.5 to boolean"', () =>
      expect(getMsg(() => toBoolean(0.5))).toBe('Cannot convert 0.5 to boolean'));
    it('100 → "Cannot convert 100 to boolean"', () =>
      expect(getMsg(() => toBoolean(100))).toBe('Cannot convert 100 to boolean'));

    // NaN and Infinity: JSON.stringify serializes them as "null" per JSON spec
    it('NaN → "Cannot convert null to boolean" (JSON.stringify(NaN) === "null")', () =>
      expect(getMsg(() => toBoolean(NaN))).toBe('Cannot convert null to boolean'));
    it('Infinity → "Cannot convert null to boolean" (JSON.stringify(Infinity) === "null")', () =>
      expect(getMsg(() => toBoolean(Infinity))).toBe('Cannot convert null to boolean'));
    it('-Infinity → "Cannot convert null to boolean" (JSON.stringify(-Infinity) === "null")', () =>
      expect(getMsg(() => toBoolean(-Infinity))).toBe('Cannot convert null to boolean'));

    // Strings that don't match true/false/0/1 → JSON.stringify adds quotes around them
    it('"maybe" → \'Cannot convert "maybe" to boolean\'', () =>
      expect(getMsg(() => toBoolean('maybe'))).toBe('Cannot convert "maybe" to boolean'));
    it('"yes" → \'Cannot convert "yes" to boolean\'', () =>
      expect(getMsg(() => toBoolean('yes'))).toBe('Cannot convert "yes" to boolean'));
    it('"no" → \'Cannot convert "no" to boolean\'', () =>
      expect(getMsg(() => toBoolean('no'))).toBe('Cannot convert "no" to boolean'));
    it('"" → \'Cannot convert "" to boolean\'', () =>
      expect(getMsg(() => toBoolean(''))).toBe('Cannot convert "" to boolean'));
    it('" " → \'Cannot convert " " to boolean\'', () =>
      expect(getMsg(() => toBoolean(' '))).toBe('Cannot convert " " to boolean'));
    it('"2" → \'Cannot convert "2" to boolean\'', () =>
      expect(getMsg(() => toBoolean('2'))).toBe('Cannot convert "2" to boolean'));
    it('"on" → \'Cannot convert "on" to boolean\'', () =>
      expect(getMsg(() => toBoolean('on'))).toBe('Cannot convert "on" to boolean'));

    // null → JSON.stringify(null) = "null"
    it('null → "Cannot convert null to boolean"', () =>
      expect(getMsg(() => toBoolean(null))).toBe('Cannot convert null to boolean'));

    // undefined → JSON.stringify(undefined) returns undefined → fallback to typeof
    it('undefined → "Cannot convert undefined to boolean"', () =>
      expect(getMsg(() => toBoolean(undefined))).toBe('Cannot convert undefined to boolean'));

    // Objects → JSON.stringify gives their JSON representation
    it('{} → "Cannot convert {} to boolean"', () =>
      expect(getMsg(() => toBoolean({}))).toBe('Cannot convert {} to boolean'));
    it('{a:1} → \'Cannot convert {"a":1} to boolean\'', () =>
      expect(getMsg(() => toBoolean({ a: 1 }))).toBe('Cannot convert {"a":1} to boolean'));
    it('{x:true,y:false} → serialized JSON form', () =>
      expect(getMsg(() => toBoolean({ x: true, y: false }))).toBe('Cannot convert {"x":true,"y":false} to boolean'));
    it('[] → "Cannot convert [] to boolean"', () =>
      expect(getMsg(() => toBoolean([]))).toBe('Cannot convert [] to boolean'));
    it('[true] → "Cannot convert [true] to boolean"', () =>
      expect(getMsg(() => toBoolean([true]))).toBe('Cannot convert [true] to boolean'));
    it('new Map() → "Cannot convert {} to boolean" (Map serializes as {})', () =>
      expect(getMsg(() => toBoolean(new Map()))).toBe('Cannot convert {} to boolean'));
    it('new Set() → "Cannot convert {} to boolean" (Set serializes as {})', () =>
      expect(getMsg(() => toBoolean(new Set()))).toBe('Cannot convert {} to boolean'));

    // Functions → JSON.stringify returns undefined → fallback to typeof
    it('() => {} → "Cannot convert function to boolean"', () =>
      expect(getMsg(() => toBoolean(() => {}))).toBe('Cannot convert function to boolean'));
    it('async () => {} → "Cannot convert function to boolean"', () =>
      expect(getMsg(() => toBoolean(async () => {}))).toBe('Cannot convert function to boolean'));

    // Symbol → JSON.stringify returns undefined → fallback to typeof
    it('Symbol("x") → "Cannot convert symbol to boolean"', () =>
      expect(getMsg(() => toBoolean(Symbol('x')))).toBe('Cannot convert symbol to boolean'));

    // BigInt → JSON.stringify throws → catch → fallback to typeof
    it('BigInt(1) → "Cannot convert bigint to boolean"', () =>
      expect(getMsg(() => toBoolean(BigInt(1)))).toBe('Cannot convert bigint to boolean'));
    it('BigInt(0) → "Cannot convert bigint to boolean"', () =>
      expect(getMsg(() => toBoolean(BigInt(0)))).toBe('Cannot convert bigint to boolean'));
  });
});
