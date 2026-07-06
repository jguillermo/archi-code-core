import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISO15924Sample: ValidatorSample = {
  name: 'isISO15924',
  run: (v) => validator.isISO15924(v),
  valid: ['Latn', 'Cyrl', 'Arab', 'Hans'],
  invalid: ['xxxx', 'XXXX', '1234', 'Lat'],
};
