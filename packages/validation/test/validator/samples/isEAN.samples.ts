import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isEANSample: ValidatorSample = {
  name: 'isEAN',
  run: (v) => validator.isEAN(v),
  valid: ['4006381333931', '5901234123457', '0012345678905', '9780306406157'],
  invalid: ['4006381333932', '1234567890123', 'not-ean', '40063813339'],
};
