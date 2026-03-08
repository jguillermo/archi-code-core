import { describe, expect, it } from '@jest/globals';
import { JsonValidator } from './json.validator';

describe('JsonValidator', () => {
  describe('canBeJson', () => {
    it.each([[{ name: 'John', age: 30 }], ['{"name": "John", "age": 30}']])(
      'returns true for valid JSON: %p',
      (value) => {
        expect(JsonValidator.canBeJson(value)).toBe(true);
      },
    );

    it('returns false for object with throwing toJSON', () => {
      expect(
        JsonValidator.canBeJson({
          toJSON: () => {
            throw new Error('Invalid JSON');
          },
        }),
      ).toBe(false);
    });

    it.each([
      ['not an object'],
      [NaN],
      [Infinity],
      [-Infinity],
      [Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY],
      [''],
      ['   '],
      ['abc'],
      ['123abc'],
      ['NaN'],
      ['Infinity'],
      ['undefined'],
      ['null'],
      ['123.456.789'],
      ['123,456'],
      [true],
      [false],
      [null],
      [undefined],
      [{}],
      [[]],
      [[123]],
      [new Date()],
      [[1, 2, 3]],
      [() => 123],
      [Symbol('123')],
      [new Function('return 123')],
    ])('returns false for invalid JSON: %p', (value) => {
      expect(JsonValidator.canBeJson(value)).toBe(false);
    });
  });
});
