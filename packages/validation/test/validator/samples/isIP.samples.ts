import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIPSample: ValidatorSample = {
  name: 'isIP',
  run: (v) => validator.isIP(v),
  valid: ['127.0.0.1', '192.168.1.1', '10.0.0.1', '8.8.8.8'],
  invalid: ['999.999.999.999', 'not-an-ip', '256.0.0.1', '1.2.3'],
};
