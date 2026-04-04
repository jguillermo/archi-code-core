import { describe, expect, it } from '@jest/globals';
import { canBeDate } from '../../primitives';

// All values accepted as valid dates
const VALID_DATES = [
  // ISO 8601 date strings
  '2018-03-23T16:02:15.000Z',
  '2018-03-23',
  '2018-03-23 16:02:15.000Z',
  '2018-03-23T16:02:15',
  '2018-03-23 16:02:15',
  '2018-03-23 00:00:00',
  // same strings as Date objects
  new Date('2018-03-23T16:02:15.000Z'),
  new Date('2018-03-23'),
  new Date('2018-03-23 16:02:15.000Z'),
  new Date('2018-03-23T16:02:15'),
  new Date('2018-03-23 16:02:15'),
  new Date('2018-03-23 00:00:00'),
  // other valid Date instances
  new Date(),
  new Date('2020-01-01'),
];

// Non-date values
const NON_DATE_TYPES = [
  // strings that are not dates
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  // numbers — numeric timestamps are NOT accepted
  1,
  -1,
  1.1,
  -1.1,
  0,
  // booleans
  true,
  false,
  // objects and arrays
  { a: 123 },
  [],
  [1, 2, 3],
  // uuid
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
  new RegExp('test'),
  /test/,
  new Error('data error'),
  Promise.resolve('data promise'),
  new Map(),
  new Map([[1, 2]]),
  new Set(),
  new Set([1, 2, 3]),
];

// Date strings with invalid field values (out-of-range)
const INVALID_DATE_STRINGS = [
  '2018-03-33T16:02:15.000Z', // day > 31
  '2018-13-23T16:02:15.000Z', // month > 12
  '1-03-23T16:02:15.000Z', // year too short
  '2018-03-23T25:02:15.000Z', // hour > 23
  '2018-03-23T15:61:15.000Z', // minutes > 59
  '2018-03-23T15:02:61.000Z', // seconds > 59
];

describe('canBeDate', () => {
  it.each(VALID_DATES.map((v) => [v]))('returns true for valid date: %p', (value) => {
    expect(canBeDate(value)).toBe(true);
  });

  it.each([...NON_DATE_TYPES, ...INVALID_DATE_STRINGS].map((v) => [v]))(
    'returns false for invalid date: %p',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );
});
