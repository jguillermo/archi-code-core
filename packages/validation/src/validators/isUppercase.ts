import coerceToString from './util/coerceToString';

export default function isUppercase(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return str === str.toUpperCase();
}
