import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isAfterSample: ValidatorSample = {
  name: 'isAfter',
  run: (v) => validator.isAfter(v, '2020-01-01'),
  valid: ['2030-01-01', '2025-06-15', '2028-12-31', '2027-03-20'],
  invalid: ['2019-12-31', '2020-01-01', '1999-01-01', '2000-06-15'],
};
