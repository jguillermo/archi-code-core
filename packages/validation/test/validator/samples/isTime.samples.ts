import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isTimeSample: ValidatorSample = {
  name: 'isTime',
  run: (v) => validator.isTime(v, {}),
  valid: ['23:59', '00:00', '12:30', '08:45'],
  invalid: ['25:00', '23:60', 'not-time', '12:345'],
};
