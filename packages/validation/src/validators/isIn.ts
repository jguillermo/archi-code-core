import { toString } from '../convert/string';
import { toEnum } from '../convert/enum';
import { configText, optionsOf } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';

export interface IsInOptions {
  values: unknown[] | Record<string, unknown> | string;
}

export function isIn(value: unknown, options: IsInOptions): boolean {
  const { values } = optionsOf(options);
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  let i;
  if (Object.prototype.toString.call(values) === '[object Array]') {
    const array: string[] = [];
    for (i in values as unknown[]) {
      // istanbul ignore else
      if ({}.hasOwnProperty.call(values, i)) {
        const item = toString((values as unknown as Record<string, unknown>)[i]);
        if (item.ok) array[i] = item.value;
      }
    }
    return toEnum(str, array).ok;
  }
  if (values !== null && typeof values === 'object') {
    return Object.prototype.hasOwnProperty.call(values, str);
  }
  if (values === undefined || values === null) return false;
  if (typeof values === 'string') {
    // Historic validator.js behaviour: a string list means a substring check.
    return (values as string).indexOf(str) >= 0;
  }
  throw new ValidationConfigError(
    `values must be an array, an object or a string, got ${configText(values)}`,
  );
}
