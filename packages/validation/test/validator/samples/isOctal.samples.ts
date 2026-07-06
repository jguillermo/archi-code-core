import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isOctalSample: ValidatorSample = {
  name: 'isOctal',
  run: (v) => validator.isOctal(v),
  valid: ['0o767', '0o644', '0o755', '0o777'],
  invalid: ['0o999', '0o888', '12345678', 'not-octal'],
};
