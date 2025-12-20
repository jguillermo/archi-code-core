import { describe } from '@jest/globals';
import { testValidation } from '@code-core/test';
import { JsonValidator } from './json.validator';

describe('JsonValidator', () => {
  describe('canBeJson', () => {
    testValidation({
      validator: JsonValidator.canBeJson,
      valid: [{ name: 'John', age: 30 }, '{"name": "John", "age": 30}'],
      invalid: [
        'not an object',
        {
          toJSON: () => {
            throw new Error('Invalid JSON');
          },
        },
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
        [1, 2, 3], // Objects and Arrays
        () => 123,
        Symbol('123'),
        new Function('return 123'), // Other types
      ],
    });
  });
});
