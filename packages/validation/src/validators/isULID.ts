import coerceToString from './util/coerceToString';

export default function isULID(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(str);
}
