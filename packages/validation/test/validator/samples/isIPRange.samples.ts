import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIPRangeSample: ValidatorSample = {
  name: 'isIPRange',
  run: (v) => validator.isIPRange(v),
  valid: ['127.0.0.1/24', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
  invalid: ['192.168.1.0/33', '999.999.999.999/24', 'not-range', '192.168.1.0'],
};
