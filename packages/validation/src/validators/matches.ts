import coerceToString from './util/coerceToString';

export default function matches(str, pattern, modifiers) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
    pattern = new RegExp(pattern, modifiers);
  }
  return !!str.match(pattern);
}
