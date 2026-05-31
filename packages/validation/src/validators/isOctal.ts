import coerceToString from './util/coerceToString';

const octal = /^(0o)?[0-7]+$/i;

export default function isOctal(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return octal.test(str);
}
