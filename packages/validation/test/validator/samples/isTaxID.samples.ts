import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isTaxIDSample: ValidatorSample = {
  name: 'isTaxID',
  run: (v) => validator.isTaxID(v, 'en-US'),
  valid: ['01-1234567', '12-3456789', '99-9999999', '45-1234567'],
  invalid: ['12-345678', '!@#-INVALID', 'not-tax-id', 'AB-1234567'],
};
