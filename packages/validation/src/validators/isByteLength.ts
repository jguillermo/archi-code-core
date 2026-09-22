import type { IsByteLengthOptions } from '../types';
import tryToString from './util/tryToString';

export default function isByteLength(
  str: unknown,
  optionsOrMin?: IsByteLengthOptions | number,
  maxArg?: number,
): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  let min: number;
  let max: number | undefined;
  if (typeof optionsOrMin === 'object') {
    min = optionsOrMin.min || 0;
    max = optionsOrMin.max;
  } else {
    // backwards compatibility: isByteLength(str, min [, max])
    min = optionsOrMin || 0;
    max = maxArg;
  }
  const len = encodeURI(s).split(/%..|./).length - 1;
  return len >= min && (typeof max === 'undefined' || len <= max);
}
