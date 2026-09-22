import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isAlphanumericSample: ValidatorSample = {
  name: 'isAlphanumeric',
  run: (v) => validator.isAlphanumeric(v),
  valid: ['abc123', 'Hello123', 'test456', 'ABC789'],
  invalid: ['abc!@#', 'has space', '!!!', 'abc-def'],
};
