import tryToString from './util/tryToString';

/* eslint-disable no-control-regex */
const ascii = /^[\x00-\x7F]+$/;
/* eslint-enable no-control-regex */

export default function isAscii(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return ascii.test(str);
}
