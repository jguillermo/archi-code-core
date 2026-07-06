import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isVATSample: ValidatorSample = {
  name: 'isVAT',
  run: (v) => validator.isVAT(v, 'GB'),
  valid: ['GBGD499', 'GBGD100', 'GBGD200', 'GBGD300'],
  invalid: ['not-vat', 'USABC1234567', 'INVALID', 'GBINVALID'],
};
