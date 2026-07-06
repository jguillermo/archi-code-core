import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIntSample: ValidatorSample = {
  name: 'isInt',
  run: (v) => validator.isInt(v, {}),
  valid: ['42', '-5', '100', '-1000'],
  invalid: ['3.14', 'abc', '1e10', 'not-int'],
};
