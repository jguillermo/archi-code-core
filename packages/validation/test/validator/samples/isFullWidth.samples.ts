import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isFullWidthSample: ValidatorSample = {
  name: 'isFullWidth',
  run: (v) => validator.isFullWidth(v),
  valid: ['ひらがな・カタカナ', '漢字テスト', 'ＡＢＣＤ', '１２３４'],
  invalid: ['abc', '123', 'ASCII', 'hello world'],
};
