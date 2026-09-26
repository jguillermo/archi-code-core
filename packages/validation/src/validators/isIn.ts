import { toString } from '../convert/string';
import { toEnum } from '../convert/enum';
import { configText } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';

export function isIn(
  input: unknown,
  values: unknown[] | Record<string, unknown> | string,
): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  let i;
  if (Object.prototype.toString.call(values) === '[object Array]') {
    const array: string[] = [];
    for (i in values as unknown[]) {
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
  if (values !== null && typeof values === 'object') {
    return Object.prototype.hasOwnProperty.call(values, str);
  }
  // No list (undefined / null) → nothing is in it (historic behaviour).
  if (values === undefined || values === null) return false;
  if (typeof values === 'string') {
    // Historic behaviour: "in another string" is a substring check.
    return (values as string).indexOf(str) >= 0;
  }
  throw new ValidationConfigError(
    `values must be an array, an object or a string, got ${configText(values)}`,
  );
}
