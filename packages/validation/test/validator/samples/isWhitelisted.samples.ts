import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isWhitelistedSample: ValidatorSample = {
  name: 'isWhitelisted',
  run: (v) => validator.isWhitelisted(v, 'abc'),
  valid: ['abc', 'aaa', 'bbb', 'ccc'],
  invalid: ['xyz', 'def', 'hello', 'zzz'],
};
