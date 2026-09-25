import tryToString from './util/tryToString';

/* eslint-disable no-control-regex */
const ascii = /^[\x00-\x7F]+$/;
/* eslint-enable no-control-regex */

export default function isAscii(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return ascii.test(str);
}
