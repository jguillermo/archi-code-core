import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isHSLSample: ValidatorSample = {
  name: 'isHSL',
  run: (v) => validator.isHSL(v),
  valid: ['hsl(120, 100%, 50%)', 'hsl(0, 100%, 50%)', 'hsl(240, 100%, 50%)', 'hsl(60, 50%, 75%)'],
  invalid: ['rgb(0,0,0)', 'not-hsl', '(0,0%,0%)', 'hsl[0,0%,0%]'],
};
