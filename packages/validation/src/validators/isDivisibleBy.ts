import tryToString from './util/tryToString';
import toFloat from './toFloat';

export default function isDivisibleBy(str, num) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return toFloat(str) % parseInt(num, 10) === 0;
}
