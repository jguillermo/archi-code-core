import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isLengthSample: ValidatorSample = {
  name: 'isLength',
  run: (v) => validator.isLength(v, { min: 3, max: 8 }),
  valid: ['hello', 'world', 'test', 'abc'],
  invalid: ['ab', 'x', 'toolooooong', 'waytoolong'],
};
