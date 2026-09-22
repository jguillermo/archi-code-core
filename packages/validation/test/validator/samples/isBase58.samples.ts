import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBase58Sample: ValidatorSample = {
  name: 'isBase58',
  run: (v) => validator.isBase58(v),
  valid: ['BukQL', 'Satoshi', 'Nakamoto', 'Crypto'],
  invalid: ['has-hyphen', 'has space', 'contains!', 'zero0char'],
};
