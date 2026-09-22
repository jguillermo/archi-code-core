import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isIMEISample: ValidatorSample = {
  name: 'isIMEI',
  run: (v) => validator.isIMEI(v, {}),
  valid: ['356938035643809', '490154203237518', '012345678901237', '353879234252633'],
  invalid: ['356938035643800', '111111111111111', 'not-an-imei', '12345678901234'],
};
