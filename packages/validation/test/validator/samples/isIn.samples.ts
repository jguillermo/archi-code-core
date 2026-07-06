import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isInSample: ValidatorSample = {
  name: 'isIn',
  run: (v) => validator.isIn(v, ['a', 'b', 'c']),
  valid: ['a', 'b', 'c'],
  invalid: ['d', 'e', 'f', 'z'],
};
