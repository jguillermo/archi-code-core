import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO4217Sample: ValidatorSample = {
  name: 'isISO4217',
  run: (v) => validator.isISO4217(v),
  valid: ['USD', 'EUR', 'GBP', 'JPY', 'CHF'],
  invalid: ['QQQ', 'PPP', 'AB', '1234'],
};
