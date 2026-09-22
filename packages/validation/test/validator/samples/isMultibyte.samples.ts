import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isMultibyteSample: ValidatorSample = {
  name: 'isMultibyte',
  run: (v) => validator.isMultibyte(v),
  valid: ['ひらがな', '漢字', 'тест', 'العربية'],
  invalid: ['abc', '123', 'ASCII', 'simple text'],
};
