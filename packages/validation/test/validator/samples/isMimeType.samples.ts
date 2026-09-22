import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMimeTypeSample: ValidatorSample = {
  name: 'isMimeType',
  run: (v) => validator.isMimeType(v),
  valid: ['application/json', 'text/html', 'image/png', 'application/pdf'],
  invalid: ['not-mime', 'application', '/json', 'invalid'],
};
