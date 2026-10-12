import { toString } from '../convert/string';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { escapeRegExp } from '../helpers/escapeRegExp';
import { alpha } from './alpha';
import { configText, optionsOf } from '../helpers/config';

export type AlphaLocale = keyof typeof alpha | (string & {});

export interface IsAlphaOptions {
  locale?: AlphaLocale;
  ignore?: string | RegExp;
}

export function isAlpha(value: unknown, options?: IsAlphaOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  let str: string = s;
  const { locale = 'en-US', ignore } = optionsOf(options);

  if (ignore) {
    if (ignore instanceof RegExp) {
      // A global/sticky regex resumes at lastIndex; reset it so earlier calls do not leak in.
      ignore.lastIndex = 0;
      str = str.replace(ignore, '');
    } else if (typeof ignore === 'string') {
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
