import coerceToString from './util/coerceToString';

export default function isWhitelisted(str, chars) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  for (let i = str.length - 1; i >= 0; i--) {
    if (chars.indexOf(str[i]) === -1) {
      return false;
    }
  }
  return true;
}
