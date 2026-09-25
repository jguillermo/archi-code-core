import { toString } from '../convert/string';
import { boundsOf } from './util/config';

export interface IsByteLengthOptions {
  min?: number;
  max?: number;
}

export function isByteLength(
  str: unknown,
  optionsOrMin?: IsByteLengthOptions | number,
  maxArg?: number,
): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  // backwards compatibility: isByteLength(str, min [, max])
  const { min, max } = boundsOf(optionsOrMin, maxArg);
  const len = utf8ByteLength(s);
  return len >= min && (typeof max === 'undefined' || len <= max);
}

/**
 * UTF-8 byte length. Unlike `encodeURI` it never throws: an unpaired surrogate counts as the
 * 3 bytes of the U+FFFD replacement character (what `TextEncoder` writes for it).
 */
function utf8ByteLength(s: string): number {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < s.length) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}
