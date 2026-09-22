import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isRFC3339Sample: ValidatorSample = {
  name: 'isRFC3339',
  run: (v) => validator.isRFC3339(v),
  valid: [
    '2009-05-19 14:39:22Z',
    '2020-01-01T00:00:00Z',
    '2023-06-15T12:30:00Z',
    '1990-12-31T23:59:59Z',
  ],
  invalid: ['2020-01-01', 'not-rfc3339', '2020-13-01T00:00:00Z', '2020-01-01 99:99:99Z'],
};
