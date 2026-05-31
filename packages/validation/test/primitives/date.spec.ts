import { describe, expect, it } from '@jest/globals';
import { canBeDate } from '../../src/primitives';

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
  new WeakMap(),
  new WeakSet(),
  BigInt(42),
];

// Date strings with invalid field values (pass regex, fail Date parsing)
const OUT_OF_RANGE_DATE_STRINGS = [
  // --- month out of range ---
  '2018-00-15', // month 00
  '2018-00-15T12:00:00', // month 00 with time
  '2018-13-23T16:02:15.000Z', // month 13 with datetime
  '2018-13-01', // month 13 date-only
  '2025-13-05', // month 13 recent year

  // --- day out of range ---
  '2018-01-00', // day 00
  '2018-03-33T16:02:15.000Z', // day 33
  '2018-01-32', // day 32
  '2018-04-31', // April has 30 days
  '2018-06-31', // June has 30 days
  '2018-09-31', // September has 30 days
  '2018-11-31', // November has 30 days

  // --- February edge cases ---
  '2018-02-29', // Feb 29 on non-leap year (2018)
  '2019-02-29', // Feb 29 on non-leap year (2019)
  '2100-02-29', // Feb 29 on non-leap year (2100 — divisible by 100 but not 400)
  '2018-02-30', // Feb 30 never exists
  '2020-02-30', // Feb 30 even on leap year

  // --- hour/minute/second out of range ---
  '2018-03-23T25:02:15.000Z', // hour 25
  '2018-03-23T24:00:00', // hour 24
  '2018-03-23T15:61:15.000Z', // minutes 61
  '2018-03-23T00:60:00', // minutes 60
  '2018-03-23T15:02:61.000Z', // seconds 61
  '2018-03-23T00:00:60', // seconds 60
];

// Date strings that don't match the expected format (fail regex)
const WRONG_FORMAT_DATE_STRINGS = [
  '1-03-23T16:02:15.000Z', // year too short (1 digit)
  '18-03-23', // 2-digit year
  '218-03-23', // 3-digit year
  '2018-3-23', // single-digit month
  '2018-03-5', // single-digit day
  '2018/03/23', // forward-slash separator
  '23/03/2018', // European DD/MM/YYYY
  '03-23-2018', // US-style MM-DD-YYYY
  '2018.03.23', // dot separator
  '20180323', // no separator (compact ISO)
  '2018-03-23T16:02', // truncated time — missing seconds
  '2018-03-23 16:02', // truncated time with space
  '2018-03-23Z', // timezone without time part
  '2018-03-23T16:02:15+99:99', // invalid timezone offset (not in format)
  'March 23, 2018', // natural language
  '23 March 2018', // natural language
  '2018-W12-3', // ISO week date
];

describe('canBeDate', () => {
  it.each(VALID_DATES.map((v) => [v]))('returns true for valid date: %p', (value) => {
    expect(canBeDate(value)).toBe(true);
  });

  it.each(NON_DATE_TYPES.map((v) => [v]))('returns false for non-date type: %p', (value) => {
    expect(canBeDate(value)).toBe(false);
  });

  it.each(OUT_OF_RANGE_DATE_STRINGS.map((v) => [v]))(
    'returns false for out-of-range date string: %p',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );

  it.each(WRONG_FORMAT_DATE_STRINGS.map((v) => [v]))(
    'returns false for wrong-format date string: %p',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );
});
