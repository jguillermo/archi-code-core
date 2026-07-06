import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isEmptySample: ValidatorSample = {
  name: 'isEmpty',
  run: (v) => validator.isEmpty(v, {}),
  valid: [''],
  invalid: [' ', 'not-empty', 'a', 'x'],
};
