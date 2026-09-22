import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBase32Sample: ValidatorSample = {
  name: 'isBase32',
  run: (v) => validator.isBase32(v, {}),
  valid: ['JBSWY3DP', 'MFRA====', 'ORSXG5A=', 'NBSWY3DPEB3W64TMMQ======'],
  invalid: ['not-base32!', 'lowercase-fail', '12345678!', '====AAAA'],
};
