import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isFreightContainerIDSample: ValidatorSample = {
  name: 'isFreightContainerID',
  run: (v) => validator.isFreightContainerID(v),
  valid: ['HLXU2008419', 'TGHU7599330', 'ECMU4657496', 'MEDU6246078'],
  invalid: ['HLXU2008410', 'NOTCONTAINER', 'ABCD1234567', 'HLXU000000'],
};
