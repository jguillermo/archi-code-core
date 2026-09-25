import tryToString from './util/tryToString';
import isFloat from './isFloat';

export default function isDivisibleBy(str: unknown, num: number): boolean {
  const s = tryToString(str);
  if (s === false || !isFloat(s)) return false;
  return parseFloat(s) % parseInt(String(num), 10) === 0;
}
