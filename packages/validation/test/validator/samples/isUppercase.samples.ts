import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isUppercaseSample: ValidatorSample = {
  name: 'isUppercase',
  run: (v) => validator.isUppercase(v),
  valid: ['ABC DEF', 'HELLO WORLD', 'TEST STRING', 'UPPERCASE ONLY'],
  invalid: ['lowercase', 'Mixed Case', 'has lower', 'notUpper'],
};
