import validator from '../../../src/validators';
import type { ValidatorSample } from './types';

export const isSurrogatePairSample: ValidatorSample = {
  name: 'isSurrogatePair',
  run: (v) => validator.isSurrogatePair(v),
  valid: ['𠮷野𩸽', '𝄞music', '😀😁😂😃', '𝕳𝖊𝖑𝖑𝖔'],
  invalid: ['abc', '漢字', 'ひらがな', 'no surrogates here'],
};
