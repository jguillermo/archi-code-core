import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isNumericSample: ValidatorSample = {
  name: 'isNumeric',
  run: (v) => validator.isNumeric(v, {}),
  valid: ['12345', '98765', '11111', '99999'],
  invalid: ['abc', 'twelve', 'hello', 'not-numeric'],
};
