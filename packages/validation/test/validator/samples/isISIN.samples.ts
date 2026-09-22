import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISINSample: ValidatorSample = {
  name: 'isISIN',
  run: (v) => validator.isISIN(v),
  valid: ['US0378331005', 'GB0002634946', 'DE0005140008', 'FR0000131104'],
  invalid: ['US0378331006', 'NOTANISIN', 'XX00000000', 'US037833100'],
};
