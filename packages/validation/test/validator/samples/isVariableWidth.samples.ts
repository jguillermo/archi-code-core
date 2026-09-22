import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isVariableWidthSample: ValidatorSample = {
  name: 'isVariableWidth',
  run: (v) => validator.isVariableWidth(v),
  valid: ['ひらがなABCDE', 'テストtest', '漢字123', 'ＡＢＣabc'],
  invalid: ['allascii', 'ALLASCII', '12345678', 'only-ascii-here'],
};
