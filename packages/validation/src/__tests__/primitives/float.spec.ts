import { describe, expect, it } from '@jest/globals';
import { canBeFloat } from '../../primitives';

describe('canBeFloat', () => {
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
    ['123'],
    ['-123'],
    ['   123   '],
    ['0.456'],
    ['4e2'],
    ['0034'],
    ['+123'],
    [Number.MAX_VALUE],
    [Number.MIN_VALUE],
    [Number.EPSILON],
  ])('returns true for numeric: %p', (value) => {
    expect(canBeFloat(value)).toBe(true);
  });

  it.each([
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
    [{ value: 123 }],
    [[1, 2, 3]],
    [() => 123],
    [Symbol('123')],
    [new Function('return 123')],
  ])('returns false for non-numeric: %p', (value) => {
    expect(canBeFloat(value)).toBe(false);
  });
});
