import coerceToString from './util/coerceToString';

/* eslint-disable no-control-regex */
const multibyte = /[^\x00-\x7F]/;
/* eslint-enable no-control-regex */

export default function isMultibyte(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return multibyte.test(str);
}
