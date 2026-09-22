import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isBtcAddressSample: ValidatorSample = {
  name: 'isBtcAddress',
  run: (v) => validator.isBtcAddress(v),
  valid: [
    '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    '3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC',
  ],
  invalid: ['not-btc', '1000000000000000000000000000000000', '0xinvalid', 'short'],
};
