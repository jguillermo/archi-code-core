import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isPassportNumberSample: ValidatorSample = {
  name: 'isPassportNumber',
  run: (v) => validator.isPassportNumber(v, 'US'),
  valid: ['123456789', '987654321', '100000001', '234567890'],
  invalid: ['12345678', '1234567890', 'ABCDEFGHI', 'abc123456'],
};
