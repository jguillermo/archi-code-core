import { describe, expect, it } from '@jest/globals';
import { canBeArray } from '../../primitives';

describe('canBeArray', () => {
  it.each([
    [[] as unknown[]],
    [[1, 2, 3]],
    [[{}, null, 'text']],
    ['[1,2,3]'],
    ['[]'],
    ['["a","b"]'],
    ['[{"key":1}]'],
  ])('returns true for %p', (value) => {
    expect(canBeArray(value)).toBe(true);
  });

  it.each([
    ['{"a":1}'],
    ['hello'],
    ['42'],
    ['"text"'],
    [''],
    ['   '],
    [null],
    [undefined],
    [{}],
    [{ a: 1 }],
    [42],
    [true],
    [false],
    [NaN],
    [new Date()],
    [() => 123],
    [Symbol('123')],
    [new Map()],
    [new Set()],
  ])('returns false for %p', (value) => {
    expect(canBeArray(value)).toBe(false);
  });
});
