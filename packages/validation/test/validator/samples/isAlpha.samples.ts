import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isAlphaSample: ValidatorSample = {
  name: 'isAlpha',
  run: (v) => validator.isAlpha(v),
  valid: ['abcDEF', 'HELLO', 'world', 'TypeScript'],
  invalid: ['abc123', 'hello!', 'has space', '123'],
};
