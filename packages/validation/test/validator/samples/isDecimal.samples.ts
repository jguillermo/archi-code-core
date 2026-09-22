import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isDecimalSample: ValidatorSample = {
  name: 'isDecimal',
  run: (v) => validator.isDecimal(v, {}),
  valid: ['3.14', '2.718', '1.414', '100.00'],
  invalid: ['3.14.15', 'not-decimal', 'abc', '1,234'],
};
