import { describe } from '@jest/globals';
import { canByType, PrimitivesKeys, skipByType, testValidation } from '@code-core/test';
import { DateValidator } from './date.validator';

describe('DateValidator', () => {
  describe('canBeDate', () => {
    testValidation({
      validator: DateValidator.canBeDate,
      valid: canByType(PrimitivesKeys.DATE),
      invalid: [
        ...skipByType(PrimitivesKeys.DATE),
        //day
        '2018-03-33T16:02:15.000Z',
        //month
        '2018-13-23T16:02:15.000Z',
        //year
        '1-03-23T16:02:15.000Z',
        //hour
        '2018-03-23T25:02:15.000Z',
        //minutes
        '2018-03-23T15:61:15.000Z',
        //seconds
        '2018-03-23T15:02:61.000Z',
      ],
    });
  });
});
