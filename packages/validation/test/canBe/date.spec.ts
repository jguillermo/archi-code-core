import { describe, expect, it } from 'vitest';
import { canBeDate } from '../../src/canBe';

const VALID_DATES = [
  '2018-03-23',
  '2018/03/23',
  new Date('2018-03-23T16:02:15.000Z'),
  new Date('2018-03-23'),
  new Date('2018-03-23 16:02:15.000Z'),
  new Date('2018-03-23T16:02:15'),
  new Date('2018-03-23 16:02:15'),
  new Date('2018-03-23 00:00:00'),
  new Date(),
  new Date('2020-01-01'),
];

const NON_DATE_TYPES = [
  'random',
  '',
  '   ',
  'áéíóú',
  'abc123',
  1,
  -1,
  1.1,
  -1.1,
  0,
  true,
  false,
  { a: 123 },
  [],
  [1, 2, 3],
  'df9ef000-21fc-4e06-b8f7-103c3a133d10',
  () => 123,
  new Function('return 123'),
  undefined,
  null,
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

const OUT_OF_RANGE_DATE_STRINGS = [
  '2018-00-15',
  '2018-00-15T12:00:00',
  '2018-13-23T16:02:15.000Z',
  '2018-13-01',
  '2025-13-05',

  '2018-01-00',
  '2018-03-33T16:02:15.000Z',
  '2018-01-32',
  '2018-04-31',
  '2018-06-31',
  '2018-09-31',
  '2018-11-31',

  '2018-02-29',
  '2019-02-29',
  '2100-02-29',
  '2018-02-30',
  '2020-02-30',

  '2018-03-23T25:02:15.000Z',
  '2018-03-23T24:00:00',
  '2018-03-23T15:61:15.000Z',
  '2018-03-23T00:60:00',
  '2018-03-23T15:02:61.000Z',
  '2018-03-23T00:00:60',

  '2018-03-23T16:02:15+00:60',
];

const WRONG_FORMAT_DATE_STRINGS = [
  '1-03-23T16:02:15.000Z',
  '18-03-23',
  '218-03-23',
  '2018-3-23',
  '2018-03-5',
  '23/03/2018',
  '03-23-2018',
  '2018.03.23',
  '20180323',
  '2018-03-23T16:02',
  '2018-03-23 16:02',
  '2018-03-23Z',
  '2018-03-23T16:02:15+99:99',
  'March 23, 2018',
  '23 March 2018',
  '2018-W12-3',
];

const DATE_TIME_STRINGS = [
  '2018-03-23T16:02:15.000Z',
  '2018-03-23 16:02:15.000Z',
  '2018-03-23T16:02:15',
  '2018-03-23 16:02:15',
  '2018-03-23 00:00:00',
];

describe('canBeDate', () => {
  it.each(DATE_TIME_STRINGS.map((v) => [v]))(
    'returns false for date-time string (date part only by default): %o',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );

  it.each(VALID_DATES.map((v) => [v]))('returns true for valid date: %o', (value) => {
    expect(canBeDate(value)).toBe(true);
  });

  it.each(NON_DATE_TYPES.map((v) => [v]))('returns false for non-date type: %o', (value) => {
    expect(canBeDate(value)).toBe(false);
  });

  it.each(OUT_OF_RANGE_DATE_STRINGS.map((v) => [v]))(
    'returns false for out-of-range date string: %o',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );

  it.each(WRONG_FORMAT_DATE_STRINGS.map((v) => [v]))(
    'returns false for wrong-format date string: %o',
    (value) => {
      expect(canBeDate(value)).toBe(false);
    },
  );
});
