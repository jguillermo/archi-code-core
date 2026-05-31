import coerceToString from './util/coerceToString';

/* eslint-disable no-control-regex */
const ascii = /^[\x00-\x7F]+$/;
/* eslint-enable no-control-regex */

export default function isAscii(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return ascii.test(str);
}
