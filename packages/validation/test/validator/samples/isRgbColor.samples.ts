import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isRgbColorSample: ValidatorSample = {
  name: 'isRgbColor',
  run: (v) => validator.isRgbColor(v, {}),
  valid: ['rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)', 'rgb(128,128,128)'],
  invalid: ['rgb(999,0,0)', 'hsl(0,0%,0%)', 'not-rgb', 'rgb(0 0 0)'],
};
