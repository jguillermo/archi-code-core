import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISRCSample: ValidatorSample = {
  name: 'isISRC',
  run: (v) => validator.isISRC(v),
  valid: ['USAT29900609', 'GBAYE0601498', 'USRC15705223', 'FRUM71600073'],
  invalid: ['not-isrc', 'US-AT299-00-609', 'XXXXXXXX', '123456789'],
};
