import { validator } from '../../src/validators';
import type { ValidatorSample } from './types';

export const isNotEmptySample: ValidatorSample = {
  name: 'isNotEmpty',
  run: (v) => validator.isNotEmpty(v),
  valid: ['a', ' not-empty ', '0', 0, 42],
  invalid: ['', ' ', '\t\n', null, undefined, true, NaN],
};
