import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isSemVerSample: ValidatorSample = {
  name: 'isSemVer',
  run: (v) => validator.isSemVer(v),
  valid: ['1.0.0', '2.3.4', '0.0.1', '10.20.30'],
  invalid: ['not-semver', '1.0', 'v1.0.0', '1.0.0.0'],
};
