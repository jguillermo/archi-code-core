import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBICSample: ValidatorSample = {
  name: 'isBIC',
  run: (v) => validator.isBIC(v),
  valid: ['DEUTDEFF', 'BARCGB22', 'BNPAFRPP', 'CHASUS33'],
  invalid: ['123ABCDE', '!!INVALID', 'WAYTOOLONGBICCODE', 'bic_lower'],
};
