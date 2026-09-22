import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBeforeSample: ValidatorSample = {
  name: 'isBefore',
  run: (v) => validator.isBefore(v, '2020-01-01'),
  valid: ['2000-01-01', '2010-06-15', '1995-12-31', '2019-12-31'],
  invalid: ['2021-01-01', '2020-01-01', '2025-12-31', '2030-01-01'],
};
