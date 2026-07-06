import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isStrongPasswordSample: ValidatorSample = {
  name: 'isStrongPassword',
  run: (v) => Boolean(validator.isStrongPassword(v, undefined)),
  valid: ['Aa1!aaaa', 'P@ssw0rd!', 'Secure#123', 'MyStr0ng!Pass'],
  invalid: ['password', '12345678', 'alllower!', 'ALLUPPER1'],
};
