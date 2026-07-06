import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isFQDNSample: ValidatorSample = {
  name: 'isFQDN',
  run: (v) => validator.isFQDN(v, {}),
  valid: ['example.com', 'sub.example.org', 'foo.bar.co.uk', 'test.io'],
  invalid: ['invalid!domain', '-starts-with-dash.com', 'has spaces.com', 'notadomain'],
};
