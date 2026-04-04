import { describe, expect, it } from '@jest/globals';
import { canBeBoolean } from '../../primitives';

// All values that should be coercible to boolean
const VALID = [
  // native booleans
  true,
  false,
  // case-insensitive string booleans
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
  // numeric strings accepted as boolean (1=true, 0=false)
  '1',
  ' 1',
  '0',
  ' 0',
  // numbers accepted as boolean (1=true, 0=false)
  0,
  1,
];

// All values that are NOT boolean-coercible
const INVALID = [
  // strings
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  'yes',
  'no',
  'on',
  'off',
  // numbers that are not 0 or 1
  -1,
  1.1,
  -1.1,
  // objects
  { a: 123 },
  {},
  // arrays
  [],
  [1, 2, 3],
  // uuid string
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  // functions
  () => 123,
  new Function('return 123'),
  // nullable
  undefined,
  null,
  // exotic types
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
];

describe('canBeBoolean', () => {
  it.each(VALID.map((v) => [v]))('returns true for %p', (value) => {
    expect(canBeBoolean(value)).toBe(true);
  });

  it.each(INVALID.map((v) => [v]))('returns false for %p', (value) => {
    expect(canBeBoolean(value)).toBe(false);
  });
});
