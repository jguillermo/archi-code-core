import { describe, expect, it } from '@jest/globals';
import { toFloat, ConvertError } from '../../convert';

describe('toFloat', () => {
  describe('number → float (identity)', () => {
    it('3.14 → 3.14', () => expect(toFloat(3.14)).toBe(3.14));
    it('42 → 42', () => expect(toFloat(42)).toBe(42));
    it('0 → 0', () => expect(toFloat(0)).toBe(0));
    it('-0 → -0 (negative zero preserved)', () => expect(Object.is(toFloat(-0), -0)).toBe(true));
    it('-0.5 → -0.5', () => expect(toFloat(-0.5)).toBe(-0.5));
    it('-3.14 → -3.14', () => expect(toFloat(-3.14)).toBe(-3.14));
    it('-99.99 → -99.99', () => expect(toFloat(-99.99)).toBe(-99.99));
    it('1 → 1', () => expect(toFloat(1)).toBe(1));
    it('-1 → -1', () => expect(toFloat(-1)).toBe(-1));
    it('1.0 → 1', () => expect(toFloat(1.0)).toBe(1));
    it('0.1 → 0.1', () => expect(toFloat(0.1)).toBe(0.1));
    it('0.001 → 0.001', () => expect(toFloat(0.001)).toBe(0.001));
    it('0.000001 → 0.000001', () => expect(toFloat(0.000001)).toBe(0.000001));
    it('1e10 → 10000000000', () => expect(toFloat(1e10)).toBe(10000000000));
    it('1.5e-7 → 1.5e-7', () => expect(toFloat(1.5e-7)).toBe(1.5e-7));
    it('Number.MAX_VALUE → Number.MAX_VALUE (finite)', () => expect(toFloat(Number.MAX_VALUE)).toBe(Number.MAX_VALUE));
    it('Number.MIN_VALUE → Number.MIN_VALUE (smallest positive)', () => expect(toFloat(Number.MIN_VALUE)).toBe(Number.MIN_VALUE));
    it('Number.EPSILON → Number.EPSILON', () => expect(toFloat(Number.EPSILON)).toBe(Number.EPSILON));
    it('Number.MAX_SAFE_INTEGER → same', () => expect(toFloat(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER));
    it('Number.MIN_SAFE_INTEGER → same', () => expect(toFloat(Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER));
    it('1234567890.12345 → same', () => expect(toFloat(1234567890.12345)).toBe(1234567890.12345));
  });

  describe('string → float', () => {
    it('"3.14" → 3.14', () => expect(toFloat('3.14')).toBe(3.14));
    it('"42" → 42', () => expect(toFloat('42')).toBe(42));
    it('"0" → 0', () => expect(toFloat('0')).toBe(0));
    it('"-0" → -0', () => expect(Object.is(toFloat('-0'), -0)).toBe(true));
    it('"  -1.5  " → -1.5 (trims whitespace)', () => expect(toFloat('  -1.5  ')).toBe(-1.5));
    it('"  0  " → 0', () => expect(toFloat('  0  ')).toBe(0));
    it('"  3.14  " → 3.14', () => expect(toFloat('  3.14  ')).toBe(3.14));
    it('"-3.14" → -3.14', () => expect(toFloat('-3.14')).toBe(-3.14));
    it('".5" → 0.5 (leading dot)', () => expect(toFloat('.5')).toBe(0.5));
    it('"5." → 5 (trailing dot)', () => expect(toFloat('5.')).toBe(5));
    it('"0.1" → 0.1', () => expect(toFloat('0.1')).toBe(0.1));
    it('"+3.14" → 3.14 (explicit plus sign)', () => expect(toFloat('+3.14')).toBe(3.14));
    it('"1e5" → 100000 (scientific notation)', () => expect(toFloat('1e5')).toBe(100000));
    it('"1e-5" → 0.00001', () => expect(toFloat('1e-5')).toBe(1e-5));
    it('"1.23e4" → 12300', () => expect(toFloat('1.23e4')).toBe(12300));
    it('"1.23e-4" → 0.000123', () => expect(toFloat('1.23e-4')).toBeCloseTo(0.000123));
    it('"0.000001" → 0.000001', () => expect(toFloat('0.000001')).toBe(0.000001));
    it('"-99.99" → -99.99', () => expect(toFloat('-99.99')).toBe(-99.99));
    it('"9007199254740991" → MAX_SAFE_INT as float', () => expect(toFloat('9007199254740991')).toBe(9007199254740991));
    it('"1.7976931348623157e+308" → Number.MAX_VALUE', () => expect(toFloat('1.7976931348623157e+308')).toBe(Number.MAX_VALUE));
    it('"0xFF" → 255 (hex parsed by Number())', () => expect(toFloat('0xFF')).toBe(255));
    it('"0o10" → 8 (octal parsed by Number())', () => expect(toFloat('0o10')).toBe(8));
    it('"0b1010" → 10 (binary parsed by Number())', () => expect(toFloat('0b1010')).toBe(10));
  });

  describe('invalid number values throw ConvertError', () => {
    it('NaN throws', () => expect(() => toFloat(NaN)).toThrow(ConvertError));
    it('Infinity throws', () => expect(() => toFloat(Infinity)).toThrow(ConvertError));
    it('-Infinity throws', () => expect(() => toFloat(-Infinity)).toThrow(ConvertError));
  });

  describe('invalid string values throw ConvertError', () => {
    it('"hello" throws', () => expect(() => toFloat('hello')).toThrow(ConvertError));
    it('"" throws (empty string)', () => expect(() => toFloat('')).toThrow(ConvertError));
    it('" " throws (only spaces)', () => expect(() => toFloat(' ')).toThrow(ConvertError));
    it('"   " throws (multiple spaces)', () => expect(() => toFloat('   ')).toThrow(ConvertError));
    it('"Infinity" throws', () => expect(() => toFloat('Infinity')).toThrow(ConvertError));
    it('"-Infinity" throws', () => expect(() => toFloat('-Infinity')).toThrow(ConvertError));
    it('"NaN" throws', () => expect(() => toFloat('NaN')).toThrow(ConvertError));
    it('"1,234.56" throws (thousand separator)', () => expect(() => toFloat('1,234.56')).toThrow(ConvertError));
    it('"1 000" throws (space separator)', () => expect(() => toFloat('1 000')).toThrow(ConvertError));
    it('"1_000" throws (underscore separator)', () => expect(() => toFloat('1_000')).toThrow(ConvertError));
    it('"abc123" throws', () => expect(() => toFloat('abc123')).toThrow(ConvertError));
    it('"3.14abc" throws', () => expect(() => toFloat('3.14abc')).toThrow(ConvertError));
    it('"null" throws', () => expect(() => toFloat('null')).toThrow(ConvertError));
    it('"true" throws', () => expect(() => toFloat('true')).toThrow(ConvertError));
    it('"false" throws', () => expect(() => toFloat('false')).toThrow(ConvertError));
    it('"--1" throws (double negative)', () => expect(() => toFloat('--1')).toThrow(ConvertError));
  });

  describe('invalid types throw ConvertError', () => {
    it('true throws', () => expect(() => toFloat(true)).toThrow(ConvertError));
    it('false throws', () => expect(() => toFloat(false)).toThrow(ConvertError));
    it('null throws', () => expect(() => toFloat(null)).toThrow(ConvertError));
    it('undefined throws', () => expect(() => toFloat(undefined)).toThrow(ConvertError));
    it('plain object {} throws', () => expect(() => toFloat({})).toThrow(ConvertError));
    it('array [] throws', () => expect(() => toFloat([])).toThrow(ConvertError));
    it('array [3.14] throws', () => expect(() => toFloat([3.14])).toThrow(ConvertError));
    it('Date instance throws', () => expect(() => toFloat(new Date())).toThrow(ConvertError));
    it('function throws', () => expect(() => toFloat(() => {})).toThrow(ConvertError));
    it('symbol throws', () => expect(() => toFloat(Symbol('x'))).toThrow(ConvertError));
    it('class instance throws', () => {
      class Foo {}
      expect(() => toFloat(new Foo())).toThrow(ConvertError);
    });
  });

  describe('error message content', () => {
    it('empty string error mentions ""', () => expect(() => toFloat('')).toThrow(/Cannot convert "" to float/));
    it('NaN error mentions NaN', () => expect(() => toFloat(NaN)).toThrow(/NaN/));
    it('Infinity error mentions Infinity', () => expect(() => toFloat(Infinity)).toThrow(/Infinity/));
    it('-Infinity error mentions -Infinity', () => expect(() => toFloat(-Infinity)).toThrow(/-?Infinity/));
    it('invalid string error quotes the value', () => expect(() => toFloat('hello')).toThrow(/hello/));
    it('boolean error mentions type', () => expect(() => toFloat(true)).toThrow(/boolean/));
    it('null error mentions object', () => expect(() => toFloat(null)).toThrow(/object/));
    it('undefined error mentions undefined', () => expect(() => toFloat(undefined)).toThrow(/undefined/));
  });

  describe('result type is always number', () => {
    it('typeof result is number for number input', () => expect(typeof toFloat(3.14)).toBe('number'));
    it('typeof result is number for string input', () => expect(typeof toFloat('3.14')).toBe('number'));
    it('result is finite', () => {
      expect(Number.isFinite(toFloat(42))).toBe(true);
      expect(Number.isFinite(toFloat('3.14'))).toBe(true);
    });
  });

  describe('BigInt throws ConvertError', () => {
    it('BigInt(0) throws', () => expect(() => toFloat(BigInt(0))).toThrow(ConvertError));
    it('BigInt(1) throws', () => expect(() => toFloat(BigInt(1))).toThrow(ConvertError));
    it('BigInt(42) throws', () => expect(() => toFloat(BigInt(42))).toThrow(ConvertError));
    it('BigInt(-10) throws', () => expect(() => toFloat(BigInt(-10))).toThrow(ConvertError));
    it('BigInt error mentions "bigint" type', () => expect(() => toFloat(BigInt(1))).toThrow(/bigint/));
  });

  describe('Promise throws ConvertError', () => {
    it('Promise.resolve(3.14) throws', () => expect(() => toFloat(Promise.resolve(3.14))).toThrow(ConvertError));
    it('new Promise(() => {}) throws', () => expect(() => toFloat(new Promise(() => {}))).toThrow(ConvertError));
    it('resolved Promise error mentions "object"', () => expect(() => toFloat(Promise.resolve(0))).toThrow(/object/));
  });

  describe('function types throw ConvertError', () => {
    it('arrow function throws', () => expect(() => toFloat(() => 3.14)).toThrow(ConvertError));
    it('regular function throws', () => expect(() => toFloat(function foo() {})).toThrow(ConvertError));
    it('async function throws', () => expect(() => toFloat(async () => 3.14)).toThrow(ConvertError));
    it('generator function throws', () => expect(() => toFloat(function* () { yield 1.5; })).toThrow(ConvertError));
    it('generator object throws', () => {
      function* gen() { yield 1.5; }
      expect(() => toFloat(gen())).toThrow(ConvertError);
    });
    it('function error mentions "function" type', () => expect(() => toFloat(() => {})).toThrow(/function/));
  });

  describe('RegExp throws ConvertError', () => {
    it('/\\d+\\.\\d+/ throws', () => expect(() => toFloat(/\d+\.\d+/)).toThrow(ConvertError));
    it('new RegExp("3\\.14") throws', () => expect(() => toFloat(new RegExp('3\\.14'))).toThrow(ConvertError));
  });

  describe('Map / Set / WeakMap / WeakSet throw ConvertError', () => {
    it('empty Map throws', () => expect(() => toFloat(new Map())).toThrow(ConvertError));
    it('Map([[1, 1.5]]) throws', () => expect(() => toFloat(new Map([[1, 1.5]]))).toThrow(ConvertError));
    it('empty Set throws', () => expect(() => toFloat(new Set())).toThrow(ConvertError));
    it('Set([3.14]) throws', () => expect(() => toFloat(new Set([3.14]))).toThrow(ConvertError));
    it('WeakMap throws', () => expect(() => toFloat(new WeakMap())).toThrow(ConvertError));
    it('WeakSet throws', () => expect(() => toFloat(new WeakSet())).toThrow(ConvertError));
  });

  describe('Error instances throw ConvertError', () => {
    it('new Error("x") throws', () => expect(() => toFloat(new Error('x'))).toThrow(ConvertError));
    it('new RangeError throws', () => expect(() => toFloat(new RangeError('x'))).toThrow(ConvertError));
  });

  describe('TypedArrays and buffers throw ConvertError', () => {
    it('Uint8Array([42]) throws', () => expect(() => toFloat(new Uint8Array([42]))).toThrow(ConvertError));
    it('Float64Array([3.14]) throws', () => expect(() => toFloat(new Float64Array([3.14]))).toThrow(ConvertError));
    it('empty Float64Array throws', () => expect(() => toFloat(new Float64Array())).toThrow(ConvertError));
    it('ArrayBuffer throws', () => expect(() => toFloat(new ArrayBuffer(8))).toThrow(ConvertError));
  });

  describe('class instances throw ConvertError', () => {
    it('class with no props throws', () => {
      class Empty {}
      expect(() => toFloat(new Empty())).toThrow(ConvertError);
    });
    it('class with float prop throws', () => {
      class Measurement { constructor(public value: number) {} }
      expect(() => toFloat(new Measurement(3.14))).toThrow(ConvertError);
    });
  });

  describe('Symbol throws ConvertError', () => {
    it('Symbol("x") throws', () => expect(() => toFloat(Symbol('x'))).toThrow(ConvertError));
    it('Symbol() throws', () => expect(() => toFloat(Symbol())).toThrow(ConvertError));
    it('Symbol.for("pi") throws', () => expect(() => toFloat(Symbol.for('pi'))).toThrow(ConvertError));
    it('Symbol error mentions "symbol" type', () => expect(() => toFloat(Symbol('x'))).toThrow(/symbol/));
  });
});
