import type { IsFloatOptions } from '../types';
import { decimal } from './alpha';
import tryToString from './util/tryToString';

// The float regex only depends on the decimal separator (derived from locale).
// Cache the compiled regex per separator to avoid recompiling on every call.
const floatRegexCache = new Map<string, RegExp>();

function getFloatRegex(separator: string): RegExp {
  let re = floatRegexCache.get(separator);
  if (re === undefined) {
    re = new RegExp(
      `^(?:[-+])?(?:[0-9]+)?(?:\\${separator}[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$`,
    );
    floatRegexCache.set(separator, re);
  }
  return re;
}

export default function isFloat(str: unknown, options?: IsFloatOptions): boolean {
  // Fast path: native number — skip regex entirely
  if (typeof str === 'number') {
    if (!isFinite(str)) return false;
    options = options || {};
    return (
      (!Object.prototype.hasOwnProperty.call(options, 'min') ||
        options.min == null ||
        str >= options.min) &&
      (!Object.prototype.hasOwnProperty.call(options, 'max') ||
        options.max == null ||
        str <= options.max) &&
      (!Object.prototype.hasOwnProperty.call(options, 'lt') ||
        options.lt == null ||
        str < options.lt) &&
      (!Object.prototype.hasOwnProperty.call(options, 'gt') ||
        options.gt == null ||
        str > options.gt)
    );
  }
  // Non-string: coerce if possible, otherwise reject
  const s = tryToString(str);
  if (s === false) return false;
  options = options || {};
  const float = getFloatRegex(options.locale ? decimal[options.locale] : '.');
  if (s === '' || s === '.' || s === ',' || s === '-' || s === '+') {
    return false;
  }
  const value = parseFloat(s.replace(',', '.'));
  return (
    float.test(s) &&
    (!Object.prototype.hasOwnProperty.call(options, 'min') ||
      options.min == null ||
      value >= options.min) &&
    (!Object.prototype.hasOwnProperty.call(options, 'max') ||
      options.max == null ||
      value <= options.max) &&
    (!Object.prototype.hasOwnProperty.call(options, 'lt') ||
      options.lt == null ||
      value < options.lt) &&
    (!Object.prototype.hasOwnProperty.call(options, 'gt') ||
      options.gt == null ||
      value > options.gt)
  );
}

export const locales = Object.keys(decimal);
