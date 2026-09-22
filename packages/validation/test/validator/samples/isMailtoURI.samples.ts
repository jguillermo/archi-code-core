import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMailtoURISample: ValidatorSample = {
  name: 'isMailtoURI',
  run: (v) => validator.isMailtoURI(v, undefined),
  valid: [
    'mailto:foo@bar.com',
    'mailto:test@example.org',
    'mailto:user@domain.com',
    'mailto:info@company.co.uk',
  ],
  invalid: ['not-mailto', 'not://valid', 'http://example.com', 'tel:+1234567890'],
};
