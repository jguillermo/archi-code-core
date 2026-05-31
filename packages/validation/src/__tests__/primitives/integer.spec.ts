import { describe, expect, it } from '@jest/globals';
import { canBeInteger } from '../../primitives';

describe('canBeInteger', () => {
  it.each([
    [0],
    [42],
    [-7],
    [42.0],
    [Number.MAX_SAFE_INTEGER],
    [Number.MIN_SAFE_INTEGER],
    ['42'],
    ['-7'],
    ['0'],
    ['  10  '],
  ])('returns true for integer: %p', (value) => {
    expect(canBeInteger(value)).toBe(true);
  });

  it.each([
    [3.14],
    [0.1],
    [-0.5],
    [NaN],
    [Infinity],
    [-Infinity],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY],
    ['3.14'],
    ['abc'],
    [''],
    ['   '],
    ['NaN'],
    ['Infinity'],
    [true],
    [false],
    [null],
    [undefined],
    [{}],
    [[]],
    [[123]],
    [new Date()],
    [() => 123],
    [Symbol('123')],
    [Symbol()],
    [new Function('return 123')],
    [new Map()],
    [new Map([['key', 'value']])],
    [new Set()],
    [new Set([1, 2, 3])],
    [new WeakMap()],
    [new WeakSet()],
    [/test/],
    [new RegExp('test')],
    [new Error('data error')],
    [Promise.resolve('data promise')],
    [BigInt(42)],
  ])('returns false for non-integer: %p', (value) => {
    expect(canBeInteger(value)).toBe(false);
  });
});
