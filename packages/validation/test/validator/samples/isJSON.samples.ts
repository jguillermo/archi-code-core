import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isJSONSample: ValidatorSample = {
  name: 'isJSON',
  run: (v) => validator.isJSON(v, {}),
  valid: ['{"a":1}', '{"b":[1,2,3]}', '{"c":"test","d":true}', '[1,2,3]'],
  invalid: ['not json', '{invalid json}', 'undefined', 'key: no-quotes'],
};
