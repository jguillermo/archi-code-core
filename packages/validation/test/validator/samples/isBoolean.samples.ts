import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBooleanSample: ValidatorSample = {
  name: 'isBoolean',
  run: (v) => validator.isBoolean(v),
  valid: ['true', 'false', '1', '0'],
  invalid: ['yes', 'no', 'maybe', '2'],
};
