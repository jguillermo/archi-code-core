import { toString } from '../convert/string';
import { toEnum } from '../convert/enum';

export default function isIn(input: unknown, values: unknown[]): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  let i;
  if (Object.prototype.toString.call(values) === '[object Array]') {
    const array: string[] = [];
    for (i in values) {
      // istanbul ignore else
      if ({}.hasOwnProperty.call(values, i)) {
        // non-convertible elements are skipped
        const item = toString((values as unknown as Record<string, unknown>)[i]);
        if (item.ok) array[i] = item.value;
      }
    }
    // Membership in a list of options is the enum rule of convert.
    return toEnum(str, array).ok;
  }
  if (typeof values === 'object') {
    return Object.prototype.hasOwnProperty.call(values, str);
  }
  if (values && typeof (values as string[]).indexOf === 'function') {
    return (values as string[]).indexOf(str) >= 0;
  }
  return false;
}
