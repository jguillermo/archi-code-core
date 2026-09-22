import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isHexadecimalSample: ValidatorSample = {
  name: 'isHexadecimal',
  run: (v) => validator.isHexadecimal(v),
  valid: ['deadBEEF', 'ABCDEF12', '01234567', 'cafeBabe'],
  invalid: ['GHIJKLMN', 'not-hex', 'WXYZ1234', '!@#$%^&*'],
};
