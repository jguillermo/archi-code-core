import { describe, expect, it } from '@jest/globals';
import { canByType, PrimitivesKeys, skipByType } from '@code-core/test';
import { DateValidator } from './date.validator';

describe('DateValidator', () => {
  describe('canBeDate', () => {
    it.each(canByType(PrimitivesKeys.DATE).map((v) => [v]))('returns true for valid date: %p', (value) => {
      expect(DateValidator.canBeDate(value)).toBe(true);
    });

    it.each(
      [
        ...skipByType(PrimitivesKeys.DATE),
        '2018-03-33T16:02:15.000Z', // invalid day
        '2018-13-23T16:02:15.000Z', // invalid month
        '1-03-23T16:02:15.000Z', // invalid year
        '2018-03-23T25:02:15.000Z', // invalid hour
        '2018-03-23T15:61:15.000Z', // invalid minutes
        '2018-03-23T15:02:61.000Z', // invalid seconds
      ].map((v) => [v]),
    )('returns false for invalid date: %p', (value) => {
      expect(DateValidator.canBeDate(value)).toBe(false);
    });
  });
});
