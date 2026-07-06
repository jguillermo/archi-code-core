import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isHexColorSample: ValidatorSample = {
  name: 'isHexColor',
  run: (v) => validator.isHexColor(v, {}),
  valid: ['#ff0000', '#00ff00', '#0000ff', '#ffffff'],
  invalid: ['#xyz123', 'red', '#gg0000', '#12345'],
};
