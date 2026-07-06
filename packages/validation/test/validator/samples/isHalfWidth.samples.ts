import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isHalfWidthSample: ValidatorSample = {
  name: 'isHalfWidth',
  run: (v) => validator.isHalfWidth(v),
  valid: ['ﾊﾝｶｸ', 'ｶﾀｶﾅ', 'ｱｲｳｴｵ', 'ﾃｽﾄ'],
  invalid: ['ひらがな', '漢字テスト', 'ＡＢＣＤ', '１２３４'],
};
