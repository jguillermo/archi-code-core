import { describe } from '@jest/globals';
import { testValidation } from '@code-core/test';
import { NumberValidator } from './number.validator';

describe('NumberValidator', () => {
  describe('isNumeric', () => {
    testValidation({
      validator: NumberValidator.canBeNumber,
      valid: [
        123,
        -123,
        0,
        0.456,
        4e2,
        -1.2345e-2,
        0xff,
        0b111110111,
        0o543, // Hexadecimal, Binary, Octal numbers
        '123',
        '-123',
        '   123   ',
        '0.456',
        '4e2',
        '0034',
        '+123', // Valid string representations
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.EPSILON, // Numeric limits
      ],
      invalid: [
        NaN,
        Infinity,
        -Infinity,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        '',
        '   ',
        'abc',
        '123abc',
        'NaN',
        'Infinity',
        'undefined',
        'null',
        '123.456.789',
        '123,456', // Invalid string formats
        true,
        false, // Boolean values
        null,
        undefined, // Null and Undefined
        {},
        [],
        [123],
        new Date(),
        { value: 123 },
        [1, 2, 3], // Objects and Arrays
        () => 123,
        Symbol('123'),
        new Function('return 123'), // Other types
      ],
    });
  });
});
