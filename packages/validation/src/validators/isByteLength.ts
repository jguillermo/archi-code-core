import type { IsByteLengthOptions } from '../types';
import tryToString from './util/tryToString';

export default function isByteLength(str: unknown, options?: IsByteLengthOptions): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  let min;
  let max;
  if (typeof options === 'object') {
    min = options.min || 0;
    max = options.max;
  } else {
    // backwards compatibility: isByteLength(str, min [, max])
    min = arguments[1];
    max = arguments[2];
  }
  const len = encodeURI(s).split(/%..|./).length - 1;
  return len >= min && (typeof max === 'undefined' || len <= max);
}
