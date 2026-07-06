import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isByteLengthSample: ValidatorSample = {
  name: 'isByteLength',
  run: (v) => validator.isByteLength(v, { min: 3, max: 20 }),
  valid: ['hello', 'world', 'benchmark', 'validation'],
  invalid: ['ab', 'x', 'tooloooooooooooooooooong', 'bb'],
};
