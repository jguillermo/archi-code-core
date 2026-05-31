import coerceToString from './util/coerceToString';
import toFloat from './toFloat';

export default function isDivisibleBy(str, num) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return toFloat(str) % parseInt(num, 10) === 0;
}
