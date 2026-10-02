import test from '../cross/support/testFunctions';

describe('Validators', () => {
  it('should validate strings with content', () => {
    test({
      validator: 'isNotEmpty',
      valid: ['a', ' a ', 'foo', '0', 'false', '\ta\n', 'áéíóú'],
      invalid: ['', ' ', '   ', '\t', '\n', '\r\n', ' \t\n ', ' ', ' ', '﻿'],
    });
  });

  it('should validate finite numbers', () => {
    test({
      validator: 'isNotEmpty',
      valid: [0, -0, 1, -1, 1.5, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE],
      invalid: [NaN, Infinity, -Infinity],
    });
  });

  it('should return false for values that are neither a string nor a number', () => {
    test({
      validator: 'isNotEmpty',
      invalid: [
        null,
        undefined,
        true,
        false,
        [],
        ['a'],
        {},
        { a: 1 },
        new Date(),
        Symbol('a'),
        BigInt(1),
        () => 'a',
        new String('a'),
        new Number(1),
      ],
    });
  });
});
