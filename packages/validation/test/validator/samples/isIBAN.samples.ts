import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIBANSample: ValidatorSample = {
  name: 'isIBAN',
  run: (v) => validator.isIBAN(v),
  valid: [
    'DE89370400440532013000',
    'GB29NWBK60161331926819',
    'FR7630006000011234567890189',
    'ES9121000418450200051332',
  ],
  invalid: ['DE89370400440532013001', 'NOTANIBAN', 'XX89370400440532013000', 'INVALIDIBAN'],
};
