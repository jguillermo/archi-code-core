import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBase64Sample: ValidatorSample = {
  name: 'isBase64',
  run: (v) => validator.isBase64(v),
  valid: ['aGVsbG8gd29ybGQ=', 'dGVzdA==', 'SGVsbG8gV29ybGQh', 'dGVzdCBiYXNlNjQ='],
  invalid: ['not-base64!@#', '===invalid', 'has-special-chars!', 'aGVsbG8=====too'],
};
