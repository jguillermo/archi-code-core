import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO31661NumericSample: ValidatorSample = {
  name: 'isISO31661Numeric',
  run: (v) => validator.isISO31661Numeric(v),
  valid: ['840', '826', '276', '250', '724'],
  invalid: ['999', '000', 'ABC', '1234'],
};
