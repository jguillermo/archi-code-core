import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO31661Alpha3Sample: ValidatorSample = {
  name: 'isISO31661Alpha3',
  run: (v) => validator.isISO31661Alpha3(v),
  valid: ['USA', 'GBR', 'DEU', 'FRA', 'ESP'],
  invalid: ['XXX', 'ZZZ', 'AB1', '123'],
};
