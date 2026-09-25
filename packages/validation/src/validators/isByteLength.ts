import { toString } from '../convert/string';

export interface IsByteLengthOptions {
  min?: number;
  max?: number;
}

export default function isByteLength(
  str: unknown,
  optionsOrMin?: IsByteLengthOptions | number,
  maxArg?: number,
): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
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
