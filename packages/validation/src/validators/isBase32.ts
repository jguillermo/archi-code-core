import type { IsBase32Options } from '../types';
import { toString } from '../convert/string';
import merge from './util/merge';

const base32 = /^[A-Z2-7]+=*$/;
const crockfordBase32 = /^[A-HJKMNP-TV-Z0-9]+$/;

const defaultBase32Options = {
  crockford: false,
};

export default function isBase32(str: unknown, options?: IsBase32Options): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  options = merge(options, defaultBase32Options);

  if (options.crockford) {
    return crockfordBase32.test(s);
  }

  return s.length % 8 === 0 && base32.test(s);
}
