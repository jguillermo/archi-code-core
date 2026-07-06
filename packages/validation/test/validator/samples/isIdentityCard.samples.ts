import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIdentityCardSample: ValidatorSample = {
  name: 'isIdentityCard',
  run: (v) => validator.isIdentityCard(v, 'ES'),
  valid: ['99999999R', '12345678Z', '00000000T', '11111111H'],
  invalid: ['00000000A', '12345678A', '99999999X', '11111111A'],
};
