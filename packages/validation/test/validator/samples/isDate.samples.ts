import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isDateSample: ValidatorSample = {
  name: 'isDate',
  run: (v) => validator.isDate(v, {}),
  valid: ['2020-01-01', '2023-12-31', '2000-06-15', '1999-03-20'],
  invalid: ['2020-13-01', '2020-01-32', 'not-a-date', '20200101'],
};
