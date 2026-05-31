import tryToString from './util/tryToString';

export default function matches(str, pattern, modifiers) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
    pattern = new RegExp(pattern, modifiers);
  }
  return !!str.match(pattern);
}
