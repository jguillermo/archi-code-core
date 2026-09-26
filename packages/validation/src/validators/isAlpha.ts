import { toString } from '../convert/string';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { escapeRegExp } from '../helpers/escapeRegExp';
import { alpha } from './alpha';
import { configText, optionsOf } from '../helpers/config';

export interface IsAlphaOptions {
  ignore?: string | RegExp;
}

export function isAlpha(_str: unknown, locale = 'en-US', options?: IsAlphaOptions): boolean {
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

  if (hasOwn(alpha, locale)) {
    return alpha[locale].test(str);
  }
  throw new ValidationConfigError(`Invalid locale '${configText(locale)}'`);
}

export const locales: readonly string[] = Object.freeze(Object.keys(alpha));
