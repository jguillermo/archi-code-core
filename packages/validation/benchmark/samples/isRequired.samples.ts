import { validator } from '../../src/validators';
import type { ValidatorSample } from './types';

export const isRequiredSample: ValidatorSample = {
  name: 'isRequired',
  run: (v) => validator.isRequired(v),
  valid: ['a', '', 0, false, NaN, [], {}],
  invalid: [null, undefined],
};
