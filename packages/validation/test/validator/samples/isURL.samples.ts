import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isURLSample: ValidatorSample = {
  name: 'isURL',
  run: (v) => validator.isURL(v, {}),
  valid: [
    'https://example.com',
    'http://foo.bar.baz/path',
    'https://sub.domain.org/path?q=1',
    'ftp://files.example.com/f',
  ],
  invalid: ['not-a-url', '://invalid', 'http://', '!spaces in url.com'],
};
