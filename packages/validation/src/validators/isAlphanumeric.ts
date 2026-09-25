import { toString } from '../convert/string';
import { ValidationConfigError } from './util/errors';
import hasOwn from './util/hasOwn';
import { alphanumeric } from './alpha';

export default function isAlphanumeric(
  _str: unknown,
  locale = 'en-US',
  options: { ignore?: string | RegExp } = {},
): boolean {
  const stringResult = toString(_str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let str: string = s;
  const { ignore } = options;

  if (ignore) {
    if (ignore instanceof RegExp) {
      str = str.replace(ignore, '');
    } else if (typeof ignore === 'string') {
      str = str.replace(
        new RegExp(`[${ignore.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&')}]`, 'g'),
        '',
      ); // escape regex for ignore
    } else {
      throw new ValidationConfigError('ignore should be instance of a String or RegExp');
    }
  }

  if (hasOwn(alphanumeric, locale)) {
    return alphanumeric[locale].test(str);
  }
  throw new ValidationConfigError(`Invalid locale '${locale}'`);
}

export const locales: readonly string[] = Object.freeze(Object.keys(alphanumeric));
