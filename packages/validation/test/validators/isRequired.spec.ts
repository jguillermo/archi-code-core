import { describe, expect, it } from '@jest/globals';
import { expectTypeOf } from 'expect-type';
import test from '../cross/support/testFunctions';
import { isRequired } from '../../src/validators/isRequired';
import { validator } from '../../src/validators';
import { isNotEmpty } from '../../src/validators/isNotEmpty';

describe('Validators', () => {
  it('should return false for null and undefined', () => {
    test({ validator: 'isRequired', invalid: [null, undefined, void 0] });
  });

  it('should validate any string, empty and blank ones included', () => {
    test({
      validator: 'isRequired',
      valid: ['a', '', ' ', '   ', '\t', '\n', '0', 'false', 'null', 'undefined', 'áéíóú'],
    });
  });

  it('should validate any number, zero, NaN and infinities included', () => {
    test({
      validator: 'isRequired',
      valid: [0, -0, 1, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER],
    });
  });

  it('should validate booleans, bigints and symbols', () => {
    test({
      validator: 'isRequired',
      valid: [true, false, BigInt(0), BigInt(1), Symbol('a'), Symbol()],
    });
  });

  it('should validate empty and non-empty objects and arrays', () => {
    test({
      validator: 'isRequired',
      valid: [[], [null], [undefined], ['a'], {}, { a: undefined }, { a: 1 }, Object.create(null)],
    });
  });

  it('should validate built-in objects, invalid and boxed falsy ones included', () => {
    test({
      validator: 'isRequired',
      valid: [
        new Date(),
        new Date(NaN),
        new String(''),
        new Number(0),
        new Boolean(false),
        new Map(),
        new Set(),
        /a/,
        new Error('a'),
      ],
    });
  });

  it('should validate functions and classes', () => {
    test({
      validator: 'isRequired',
      valid: [() => 1, function named() {}, class Target {}],
    });
  });
});

describe('isRequired', () => {
  it('returns a boolean only', () => {
    expectTypeOf(isRequired).toEqualTypeOf<(value: unknown) => boolean>();
    for (const value of [null, undefined, '', 0, {}]) {
      expect(typeof isRequired(value)).toBe('boolean');
    }
  });

  it('is the validator registered as isRequired', () => {
    expect(validator.isRequired).toBe(isRequired);
  });

  it('checks presence, not content: unlike isNotEmpty, an empty or blank string is present', () => {
    for (const value of ['', '   ', NaN]) {
      expect(isRequired(value)).toBe(true);
      expect(isNotEmpty(value)).toBe(false);
    }
  });

  it('does not convert the value: the strings "null" and "undefined" are present', () => {
    expect(isRequired('null')).toBe(true);
    expect(isRequired('undefined')).toBe(true);
  });
});
