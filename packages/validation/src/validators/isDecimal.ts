import type { IsDecimalOptions } from '../types';
import merge from './util/merge';
import tryToString from './util/tryToString';
import { decimal } from './alpha';

// Cache the compiled regex keyed by the options that shape it, so repeated calls
// with the same options skip recompilation.
const decimalRegexCache = new Map<string, RegExp>();

function decimalRegExp(options: Required<IsDecimalOptions>): RegExp {
  const key = `${options.locale} ${options.decimal_digits} ${options.force_decimal}`;
  let regExp = decimalRegexCache.get(key);
  if (regExp === undefined) {
    regExp = new RegExp(
      `^[-+]?([0-9]+)?(\\${decimal[options.locale]}[0-9]{${options.decimal_digits}})${options.force_decimal ? '' : '?'}$`,
    );
    decimalRegexCache.set(key, regExp);
  }
  return regExp;
}

const default_decimal_options = {
  force_decimal: false,
  decimal_digits: '1,',
  locale: 'en-US',
};

const blacklist = ['', '-', '+'];

export default function isDecimal(str: unknown, options?: IsDecimalOptions): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  options = merge(options, default_decimal_options);
  if ((options.locale as string) in decimal) {
    return !blacklist.includes(s.replace(/ /g, '')) && decimalRegExp(options).test(s);
  }
  throw new Error(`Invalid locale '${options.locale}'`);
}
