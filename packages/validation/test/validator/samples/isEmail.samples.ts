import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isEmailSample: ValidatorSample = {
  name: 'isEmail',
  run: (v) => validator.isEmail(v, {}),
  valid: ['foo@bar.com', 'user@example.org', 'test+tag@domain.co.uk', 'admin@test.io'],
  invalid: ['not-an-email', 'missing-at.com', '@nodomain', 'spaces in@email.com'],
};
