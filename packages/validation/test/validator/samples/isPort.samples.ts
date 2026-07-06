import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isPortSample: ValidatorSample = {
  name: 'isPort',
  run: (v) => validator.isPort(v),
  valid: ['8080', '443', '3000', '65535'],
  invalid: ['65536', 'abc', '-1', '99999'],
};
