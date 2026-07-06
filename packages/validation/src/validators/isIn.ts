import tryToString from './util/tryToString';
import { toString } from '../convert';

export default function isIn(str: unknown, values: unknown[]): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  let i;
  if (Object.prototype.toString.call(values) === '[object Array]') {
    const array: string[] = [];
    for (i in values) {
      // istanbul ignore else
      if ({}.hasOwnProperty.call(values, i)) {
        try {
          array[i] = toString((values as Record<string, unknown>)[i]);
        } catch {
          // non-convertible element: skip
        }
      }
    }
    return array.indexOf(str) >= 0;
  }
  if (typeof values === 'object') {
    return Object.prototype.hasOwnProperty.call(values, str);
  }
  if (values && typeof (values as string[]).indexOf === 'function') {
    return (values as string[]).indexOf(str) >= 0;
  }
  return false;
}
