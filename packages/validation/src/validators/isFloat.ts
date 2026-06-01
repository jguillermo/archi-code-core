import type { IsFloatOptions } from '../types';
import { decimal } from './alpha';
import tryToString from './util/tryToString';

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
  const float = new RegExp(
    `^(?:[-+])?(?:[0-9]+)?(?:\\${options.locale ? decimal[options.locale] : '.'}[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$`,
  );
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
