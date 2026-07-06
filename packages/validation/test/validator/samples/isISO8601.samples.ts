import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO8601Sample: ValidatorSample = {
  name: 'isISO8601',
  run: (v) => validator.isISO8601(v),
  valid: ['2020-01-01', '2023-12-31T23:59:59Z', '2000-06-15', '1999-01-01T00:00:00'],
  invalid: ['2020-13-01', 'not-a-date', '2020/01/01', 'invalid-date'],
};
