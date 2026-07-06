import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isDataURISample: ValidatorSample = {
  name: 'isDataURI',
  run: (v) => validator.isDataURI(v),
  valid: [
    'data:text/plain;base64,aGVsbG8=',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:application/json;base64,e30=',
    'data:text/plain;base64,dGVzdA==',
  ],
  invalid: ['not-data-uri', 'data:', 'http://example.com', 'data:invalid'],
};
