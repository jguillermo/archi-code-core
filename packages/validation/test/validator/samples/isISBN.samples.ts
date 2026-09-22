import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isISBNSample: ValidatorSample = {
  name: 'isISBN',
  run: (v) => validator.isISBN(v, undefined),
  valid: ['978-3-16-148410-0', '978-0-306-40615-7', '978-1-86197-876-9', '978-0-7432-7356-5'],
  invalid: ['978-3-16-148410-1', 'not-isbn', '978-3-16', '9999999999999'],
};
