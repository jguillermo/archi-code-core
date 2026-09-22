import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isSlugSample: ValidatorSample = {
  name: 'isSlug',
  run: (v) => validator.isSlug(v),
  valid: ['my-cool-slug', 'hello-world', 'test-123', 'another-slug'],
  invalid: ['has spaces', 'UPPERCASE', 'has!special', '-starts-with-dash'],
};
