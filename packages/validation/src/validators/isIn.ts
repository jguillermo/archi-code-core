import tryToString from './util/tryToString';
import { asString } from '../core/coerce';

export default function isIn(input: unknown, values: unknown[]): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  let i;
  if (Object.prototype.toString.call(values) === '[object Array]') {
    const array: string[] = [];
    for (i in values) {
      // istanbul ignore else
      if ({}.hasOwnProperty.call(values, i)) {
        // non-convertible elements are skipped
        const item = asString((values as unknown as Record<string, unknown>)[i]);
        if (item !== undefined) array[i] = item;
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
