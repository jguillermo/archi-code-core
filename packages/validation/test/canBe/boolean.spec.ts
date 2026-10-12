import { describe, expect, it } from '@jest/globals';
import { canBeBoolean } from '../../src/canBe';

const VALID = [
  true,
  false,
  'True',
  'False',
  'TRUE',
  'FALSE',
  'true',
  'false',
  '  True  ',
  ' False ',
  ' TRUE ',
  '  FALSE ',
  ' true ',
  ' false ',
  '1',
  ' 1',
  '0',
  ' 0',
  0,
  1,
];

const INVALID = [
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  'yes',
  'no',
  'on',
  'off',
  -1,
  1.1,
  -1.1,
  { a: 123 },
  {},
  [],
  [1, 2, 3],
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  () => 123,
  new Function('return 123'),
  undefined,
  null,
  Symbol(),
  Symbol('123'),
  new Date(),
  new Date('2020-01-01'),
  new RegExp('test'),
  /test/,
  new Error('data error'),
  Promise.resolve('data promise'),
  new Map(),
  new Map([[1, 2]]),
  new Set(),
  new Set([1, 2, 3]),
  new WeakMap(),
  new WeakSet(),
  BigInt(42),
];

describe('canBeBoolean', () => {
  it.each(VALID.map((v) => [v]))('returns true for %p', (value) => {
    expect(canBeBoolean(value)).toBe(true);
  });

  it.each(INVALID.map((v) => [v]))('returns false for %p', (value) => {
    expect(canBeBoolean(value)).toBe(false);
  });
});
