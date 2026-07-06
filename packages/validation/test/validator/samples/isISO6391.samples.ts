import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO6391Sample: ValidatorSample = {
  name: 'isISO6391',
  run: (v) => validator.isISO6391(v),
  valid: ['en', 'de', 'fr', 'es', 'ja'],
  invalid: ['xx', 'zzz', 'EN', '12'],
};
