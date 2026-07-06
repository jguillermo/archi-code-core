import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isFloatSample: ValidatorSample = {
  name: 'isFloat',
  run: (v) => validator.isFloat(v),
  valid: ['3.14', '2.718', '-1.5', '100.50'],
  invalid: ['abc', 'not-float', '1,234', 'nope'],
};
