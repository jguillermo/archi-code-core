import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isAsciiSample: ValidatorSample = {
  name: 'isAscii',
  run: (v) => validator.isAscii(v),
  valid: ['abc123!@#', 'Hello World', 'test_string', '12345'],
  invalid: ['café', 'naïve', 'über', '日本語'],
};
