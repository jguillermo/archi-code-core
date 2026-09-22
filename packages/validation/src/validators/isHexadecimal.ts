import tryToString from './util/tryToString';

const hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

export default function isHexadecimal(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return hexadecimal.test(str);
}
