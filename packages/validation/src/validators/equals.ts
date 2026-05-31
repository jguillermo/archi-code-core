import coerceToString from './util/coerceToString';

export default function equals(str, comparison) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return str === comparison;
}
