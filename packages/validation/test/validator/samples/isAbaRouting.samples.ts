import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isAbaRoutingSample: ValidatorSample = {
  name: 'isAbaRouting',
  run: (v) => validator.isAbaRouting(v),
  valid: ['322271627', '021000021', '011000015', '021202337'],
  invalid: ['123456789', '111111111', 'not-aba', '12345678'],
};
