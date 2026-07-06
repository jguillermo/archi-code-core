import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isLatLongSample: ValidatorSample = {
  name: 'isLatLong',
  run: (v) => validator.isLatLong(v, {}),
  valid: ['40.7128,-74.0060', '51.5074,-0.1278', '35.6762,139.6503', '-33.8688,151.2093'],
  invalid: ['abc,def', '40.7128', '40.7128,abc', 'no-comma-here'],
};
