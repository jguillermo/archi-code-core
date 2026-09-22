import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isLicensePlateSample: ValidatorSample = {
  name: 'isLicensePlate',
  run: (v) => validator.isLicensePlate(v, 'any'),
  valid: ['AB-123-CD', 'ABC-1234', 'B-AB 1234', '1234-ABC'],
  invalid: ['!!!', 'A!@#B', 'toolongforanylicenseplate12345', '----'],
};
