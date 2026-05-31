import coerceToString from './util/coerceToString';
import { alphanumeric } from './alpha';

export default function isAlphanumeric(_str, locale = 'en-US', options: { ignore?: string | RegExp } = {}) {
  const s = coerceToString(_str);
  if (s === false) return false;
  _str = s;

  let str = _str;
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
      throw new Error('ignore should be instance of a String or RegExp');
    }
  }

  if (locale in alphanumeric) {
    return alphanumeric[locale].test(str);
  }
  throw new Error(`Invalid locale '${locale}'`);
}

export const locales = Object.keys(alphanumeric);
