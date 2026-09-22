import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isPostalCodeSample: ValidatorSample = {
  name: 'isPostalCode',
  run: (v) => validator.isPostalCode(v, 'any'),
  valid: ['28009', '10001', '75001', '10115'],
  invalid: ['!@#$%', 'POSTAL-CODE', 'AAAAAAAAAA', 'code!'],
};
