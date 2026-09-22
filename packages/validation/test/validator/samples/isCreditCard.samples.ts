import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isCreditCardSample: ValidatorSample = {
  name: 'isCreditCard',
  run: (v) => validator.isCreditCard(v),
  valid: ['4111111111111111', '5500005555555559', '378282246310005', '6011111111111117'],
  invalid: ['4111111111111112', '1234567890123456', '0000000000000000', 'not-a-card'],
};
