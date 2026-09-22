import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMobilePhoneSample: ValidatorSample = {
  name: 'isMobilePhone',
  run: (v) => validator.isMobilePhone(v, 'any', {}),
  valid: ['+12125551234', '+447911123456', '+33612345678', '+34612345678'],
  invalid: ['not-a-phone', 'abc-def-ghij', '!@#$%^&*', 'one two three'],
};
