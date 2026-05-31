import { describe, expect, it } from '@jest/globals';
import { ConvertError, toString, toInteger, toFloat, toBoolean, toDate, toJson, toArray, toEnum } from '../../convert';

function expectConvertError(fn: () => void, expectedMessage: string): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(ConvertError);
  expect((err as ConvertError).message).toBe(expectedMessage);
}

describe('ConvertError class', () => {
  it('is an instance of Error', () => expect(new ConvertError('x')).toBeInstanceOf(Error));
  it('is an instance of ConvertError', () => expect(new ConvertError('x')).toBeInstanceOf(ConvertError));
  it('name is "ConvertError"', () => expect(new ConvertError('x').name).toBe('ConvertError'));
  it('message is stored correctly', () => expect(new ConvertError('hello world').message).toBe('hello world'));
  it('has a stack trace', () => expect(new ConvertError('x').stack).toBeDefined());
  it('stack includes "ConvertError"', () => expect(new ConvertError('x').stack).toContain('ConvertError'));
  it('can be caught as Error', () => {
    let caught: unknown;
    try { toInteger('abc'); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(ConvertError);
  });
});

describe('all converters — representative error messages', () => {
  describe('toString', () => {
    it('NaN → "Cannot convert NaN to string"', () =>
      expectConvertError(() => toString(NaN), 'Cannot convert NaN to string'));
    it('null → "Cannot convert null to string"', () =>
      expectConvertError(() => toString(null), 'Cannot convert null to string'));
    it('Symbol("x") → "Cannot convert Symbol(x) to string"', () =>
      expectConvertError(() => toString(Symbol('x')), 'Cannot convert Symbol(x) to string'));
    it('BigInt(1) → "Cannot convert BigInt(1) to string"', () =>
      expectConvertError(() => toString(BigInt(1)), 'Cannot convert BigInt(1) to string'));
    it('() => {} → "Cannot convert [Function] to string"', () =>
      expectConvertError(() => toString(() => {}), 'Cannot convert [Function] to string'));
    it('new Map() → "Cannot convert [Map] to string"', () =>
      expectConvertError(() => toString(new Map()), 'Cannot convert [Map] to string'));
  });

  describe('toInteger', () => {
    it('3.14 → "Cannot convert 3.14 to integer"', () =>
      expectConvertError(() => toInteger(3.14), 'Cannot convert 3.14 to integer'));
    it('"abc" → \'Cannot convert "abc" to integer\'', () =>
      expectConvertError(() => toInteger('abc'), 'Cannot convert "abc" to integer'));
    it('null → "Cannot convert null to integer"', () =>
      expectConvertError(() => toInteger(null), 'Cannot convert null to integer'));
    it('true → "Cannot convert true to integer"', () =>
      expectConvertError(() => toInteger(true), 'Cannot convert true to integer'));
    it('Symbol("x") → "Cannot convert Symbol(x) to integer"', () =>
      expectConvertError(() => toInteger(Symbol('x')), 'Cannot convert Symbol(x) to integer'));
    it('BigInt(1) → "Cannot convert BigInt(1) to integer"', () =>
      expectConvertError(() => toInteger(BigInt(1)), 'Cannot convert BigInt(1) to integer'));
  });

  describe('toFloat', () => {
    it('NaN → "Cannot convert NaN to float"', () =>
      expectConvertError(() => toFloat(NaN), 'Cannot convert NaN to float'));
    it('"" → \'Cannot convert "" to float\'', () =>
      expectConvertError(() => toFloat(''), 'Cannot convert "" to float'));
    it('"hello" → \'Cannot convert "hello" to float\'', () =>
      expectConvertError(() => toFloat('hello'), 'Cannot convert "hello" to float'));
    it('null → "Cannot convert null to float"', () =>
      expectConvertError(() => toFloat(null), 'Cannot convert null to float'));
    it('true → "Cannot convert true to float"', () =>
      expectConvertError(() => toFloat(true), 'Cannot convert true to float'));
    it('BigInt(1) → "Cannot convert BigInt(1) to float"', () =>
      expectConvertError(() => toFloat(BigInt(1)), 'Cannot convert BigInt(1) to float'));
  });

  describe('toBoolean', () => {
    it('2 → "Cannot convert 2 to boolean"', () =>
      expectConvertError(() => toBoolean(2), 'Cannot convert 2 to boolean'));
    it('NaN → "Cannot convert NaN to boolean"  (NOT "null")', () =>
      expectConvertError(() => toBoolean(NaN), 'Cannot convert NaN to boolean'));
    it('Infinity → "Cannot convert Infinity to boolean"  (NOT "null")', () =>
      expectConvertError(() => toBoolean(Infinity), 'Cannot convert Infinity to boolean'));
    it('"maybe" → \'Cannot convert "maybe" to boolean\'', () =>
      expectConvertError(() => toBoolean('maybe'), 'Cannot convert "maybe" to boolean'));
    it('null → "Cannot convert null to boolean"', () =>
      expectConvertError(() => toBoolean(null), 'Cannot convert null to boolean'));
    it('() => {} → "Cannot convert [Function] to boolean"  (NOT "undefined")', () =>
      expectConvertError(() => toBoolean(() => {}), 'Cannot convert [Function] to boolean'));
    it('Symbol("x") → "Cannot convert Symbol(x) to boolean"  (NOT "undefined")', () =>
      expectConvertError(() => toBoolean(Symbol('x')), 'Cannot convert Symbol(x) to boolean'));
    it('BigInt(1) → "Cannot convert BigInt(1) to boolean"', () =>
      expectConvertError(() => toBoolean(BigInt(1)), 'Cannot convert BigInt(1) to boolean'));
  });

  describe('toDate', () => {
    it('new Date("invalid") → "Cannot convert Invalid Date to date"', () =>
      expectConvertError(() => toDate(new Date('invalid')), 'Cannot convert Invalid Date to date'));
    it('"not-a-date" → \'Cannot convert "not-a-date" to date\'', () =>
      expectConvertError(() => toDate('not-a-date'), 'Cannot convert "not-a-date" to date'));
    it('null → "Cannot convert null to date"', () =>
      expectConvertError(() => toDate(null), 'Cannot convert null to date'));
    it('0 → "Cannot convert 0 to date"  (NOT "number")', () =>
      expectConvertError(() => toDate(0), 'Cannot convert 0 to date'));
    it('true → "Cannot convert true to date"', () =>
      expectConvertError(() => toDate(true), 'Cannot convert true to date'));
    it('BigInt(1) → "Cannot convert BigInt(1) to date"', () =>
      expectConvertError(() => toDate(BigInt(1)), 'Cannot convert BigInt(1) to date'));
  });

  describe('toJson', () => {
    it('"hello" → "Cannot convert string to JSON object"', () =>
      expectConvertError(() => toJson('hello'), 'Cannot convert string to JSON object'));
    it('null → "Cannot convert null to JSON object"', () =>
      expectConvertError(() => toJson(null), 'Cannot convert null to JSON object'));
    it('42 → "Cannot convert 42 to JSON object"  (NOT "number")', () =>
      expectConvertError(() => toJson(42), 'Cannot convert 42 to JSON object'));
    it('true → "Cannot convert true to JSON object"', () =>
      expectConvertError(() => toJson(true), 'Cannot convert true to JSON object'));
    it('{} → "Cannot convert {} to JSON object" (empty)', () =>
      expectConvertError(() => toJson({}), 'Cannot convert {} to JSON object'));
    it('Symbol("x") → "Cannot convert Symbol(x) to JSON object"', () =>
      expectConvertError(() => toJson(Symbol('x')), 'Cannot convert Symbol(x) to JSON object'));
    it('BigInt(1) → "Cannot convert BigInt(1) to JSON object"', () =>
      expectConvertError(() => toJson(BigInt(1)), 'Cannot convert BigInt(1) to JSON object'));
  });

  describe('toArray', () => {
    it('"hello" → \'Cannot convert "hello" to array\'', () =>
      expectConvertError(() => toArray('hello'), 'Cannot convert "hello" to array'));
    it('null → "Cannot convert null to array"', () =>
      expectConvertError(() => toArray(null), 'Cannot convert null to array'));
    it('42 → "Cannot convert 42 to array"  (NOT "number")', () =>
      expectConvertError(() => toArray(42), 'Cannot convert 42 to array'));
    it('true → "Cannot convert true to array"', () =>
      expectConvertError(() => toArray(true), 'Cannot convert true to array'));
    it('Symbol("x") → "Cannot convert Symbol(x) to array"', () =>
      expectConvertError(() => toArray(Symbol('x')), 'Cannot convert Symbol(x) to array'));
    it('BigInt(1) → "Cannot convert BigInt(1) to array"', () =>
      expectConvertError(() => toArray(BigInt(1)), 'Cannot convert BigInt(1) to array'));
  });

  describe('toEnum', () => {
    it('null → "Cannot convert null to enum"', () =>
      expectConvertError(() => toEnum(null, ['a']), 'Cannot convert null to enum'));
    it('undefined → "Cannot convert undefined to enum"', () =>
      expectConvertError(() => toEnum(undefined, ['a']), 'Cannot convert undefined to enum'));
    it('{} → "Cannot convert {} to enum"', () =>
      expectConvertError(() => toEnum({}, ['a']), 'Cannot convert {} to enum'));
    it('"yellow" not in ["red"] → \'"yellow" is not a valid enum option\'', () =>
      expectConvertError(() => toEnum('yellow', ['red']), '"yellow" is not a valid enum option'));
    it('Symbol("x") → "Cannot convert Symbol(x) to enum"', () =>
      expectConvertError(() => toEnum(Symbol('x'), ['a']), 'Cannot convert Symbol(x) to enum'));
    it('BigInt(1) → "Cannot convert BigInt(1) to enum"', () =>
      expectConvertError(() => toEnum(BigInt(1), ['a']), 'Cannot convert BigInt(1) to enum'));
  });
});
