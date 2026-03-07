import { describe, expect, it } from '@jest/globals';
import { StringValidator } from './string.validator';

describe('StringValidator', () => {
  describe('isString', () => {
    it.each([
      ['123'],
      ['-123'],
      ['   123   '],
      ['0.456'],
      ['4e2'],
      ['0034'],
      ['+123'],
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
    ])('returns true for valid string: %p', (value) => {
      expect(StringValidator.isString(value)).toBe(true);
    });

    it.each([
      [123],
      [-123],
      [0],
      [0.456],
      [4e2],
      [-1.2345e-2],
      [0xff],
      [0b111110111],
      [0o543],
      [Number.MAX_VALUE],
      [Number.MIN_VALUE],
      [Number.EPSILON],
      [NaN],
      [Infinity],
      [-Infinity],
      [Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY],
      [true],
      [false],
      [null],
      [undefined],
      [{}],
      [[]],
      [[123]],
      [new Date()],
      [{ value: 123 }],
      [[1, 2, 3]],
      [() => 123],
      [Symbol('123')],
      [new Function('return 123')],
    ])('returns false for non-string: %p', (value) => {
      expect(StringValidator.isString(value)).toBe(false);
    });
  });

  describe('canBeString', () => {
    it.each([
      ['123'],
      ['-123'],
      ['   123   '],
      ['0.456'],
      ['4e2'],
      ['0034'],
      ['+123'],
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
      [123],
      [-123],
      [0],
      [0.456],
      [4e2],
      [-1.2345e-2],
      [0xff],
      [0b111110111],
      [0o543],
      [Number.MAX_VALUE],
      [Number.MIN_VALUE],
      [Number.EPSILON],
    ])('returns true for coercible to string: %p', (value) => {
      expect(StringValidator.canBeString(value)).toBe(true);
    });

    it.each([
      [NaN],
      [Infinity],
      [-Infinity],
      [Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY],
      [null],
      [undefined],
      [{}],
      [[]],
      [[123]],
      [new Date()],
      [{ value: 123 }],
      [[1, 2, 3]],
      [() => 123],
      [Symbol('123')],
      [new Function('return 123')],
    ])('returns false for non-coercible: %p', (value) => {
      expect(StringValidator.canBeString(value)).toBe(false);
    });
  });
});
