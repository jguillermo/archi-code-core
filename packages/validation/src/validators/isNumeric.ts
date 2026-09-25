import tryToString from './util/tryToString';
import { ValidationConfigError } from './util/errors';
import hasOwn from './util/hasOwn';
import { decimal } from './alpha';

const numericNoSymbols = /^[0-9]+$/;

// One compiled regex per decimal separator (instead of a new RegExp on every call).
const numericRegexCache = new Map<string, RegExp>();

function getNumericRegex(separator: string): RegExp {
  let re = numericRegexCache.get(separator);
  if (re === undefined) {
    re = new RegExp(`^[+-]?([0-9]*[${separator}])?[0-9]+$`);
    numericRegexCache.set(separator, re);
  }
  return re;
}

export default function isNumeric(
  input: unknown,
  options?: { no_symbols?: boolean; locale?: string },
): boolean {
  let separator = '.';
  if (options?.locale) {
    if (!hasOwn(decimal, options.locale))
      throw new ValidationConfigError(`Invalid locale '${options.locale}'`);
    separator = decimal[options.locale];
  }
  const s = tryToString(input);
  if (s === false) return false;
  if (options?.no_symbols) {
    return numericNoSymbols.test(s);
  }
  return getNumericRegex(separator).test(s);
}
