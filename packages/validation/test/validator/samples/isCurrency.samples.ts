import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isCurrencySample: ValidatorSample = {
  name: 'isCurrency',
  run: (v) => validator.isCurrency(v, {}),
  valid: ['$1,000.00', '$2,500.50', '$0.99', '$10,000.00'],
  invalid: ['$1.000.000,00', 'not-currency', '1 000 00', 'abc'],
};
