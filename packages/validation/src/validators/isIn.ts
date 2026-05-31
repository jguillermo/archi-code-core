import tryToString from './util/tryToString';
import { toString } from '../convert';

export default function isIn(str, options) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  let i;
  if (Object.prototype.toString.call(options) === '[object Array]') {
    const array: string[] = [];
    for (i in options) {
      // istanbul ignore else
      if ({}.hasOwnProperty.call(options, i)) {
        try {
          array[i] = toString(options[i]);
        } catch {
          // non-convertible element: skip
        }
      }
    }
    return array.indexOf(str) >= 0;
  }
  if (typeof options === 'object') {
    return options.hasOwnProperty(str);
  }
  if (options && typeof options.indexOf === 'function') {
    return options.indexOf(str) >= 0;
  }
  return false;
}
