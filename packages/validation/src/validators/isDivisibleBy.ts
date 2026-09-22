import tryToString from './util/tryToString';
import { toFloat } from '../convert';

export default function isDivisibleBy(str: unknown, num: number): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  try {
    return toFloat(s) % parseInt(num, 10) === 0;
  } catch {
    return false;
  }
}
