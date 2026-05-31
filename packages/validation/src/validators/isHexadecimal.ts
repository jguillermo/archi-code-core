import coerceToString from './util/coerceToString';

const hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

export default function isHexadecimal(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return hexadecimal.test(str);
}
