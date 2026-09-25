import { toString } from '../convert/string';
import { ValidationConfigError } from './util/errors';
import { hasOwn } from './util/hasOwn';
import { escapeRegExp } from './util/escapeRegExp';
import { alphanumeric } from './alpha';
import { configText, optionsOf } from './util/config';

export interface IsAlphanumericOptions {
  ignore?: string | RegExp;
}

export function isAlphanumeric(
  _str: unknown,
  locale = 'en-US',
  options?: IsAlphanumericOptions,
): boolean {
  const stringResult = toString(_str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let str: string = s;
  const { ignore } = optionsOf(options);

  if (ignore) {
    if (ignore instanceof RegExp) {
      // Sticky/global regexes start at lastIndex: reset it so results do not depend on earlier calls.
      ignore.lastIndex = 0;
      str = str.replace(ignore, '');
    } else if (typeof ignore === 'string') {
      // Every character of `ignore` is literal (the former escaping turned 's' into '\s').
      str = str.replace(new RegExp(`[${escapeRegExp(ignore)}]`, 'g'), '');
    } else {
      throw new ValidationConfigError('ignore should be instance of a String or RegExp');
    }
  }

  if (hasOwn(alphanumeric, locale)) {
    return alphanumeric[locale].test(str);
  }
  throw new ValidationConfigError(`Invalid locale '${configText(locale)}'`);
}

export const locales: readonly string[] = Object.freeze(Object.keys(alphanumeric));
