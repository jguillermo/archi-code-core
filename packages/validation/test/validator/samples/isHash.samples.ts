import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isHashSample: ValidatorSample = {
  name: 'isHash',
  run: (v) => validator.isHash(v, 'md5'),
  valid: [
    '900150983cd24fb0d6963f7d28e17f72',
    'd41d8cd98f00b204e9800998ecf8427e',
    '098f6bcd4621d373cade4e832627b4f6',
    '5d41402abc4b2a76b9719d911017c592',
  ],
  invalid: ['not-a-hash', 'tooshort', 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', '12345678'],
};
