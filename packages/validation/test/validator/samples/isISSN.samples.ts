import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISSNSample: ValidatorSample = {
  name: 'isISSN',
  run: (v) => validator.isISSN(v),
  valid: ['0378-5955', '0317-8471', '1050-124X', '0000-0019'],
  invalid: ['0378-5956', 'not-issn', '9999-9999', '1234'],
};
