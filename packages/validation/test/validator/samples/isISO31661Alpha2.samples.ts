import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO31661Alpha2Sample: ValidatorSample = {
  name: 'isISO31661Alpha2',
  run: (v) => validator.isISO31661Alpha2(v),
  valid: ['US', 'GB', 'DE', 'FR', 'ES'],
  invalid: ['XX', 'ZZ', 'A1', '12'],
};
