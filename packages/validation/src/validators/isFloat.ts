import type { IsFloatOptions } from '../types';
import { decimal } from './alpha';
import tryToString from './util/tryToString';

export default function isFloat(str: unknown, options?: IsFloatOptions): boolean {
  // Fast path: native number — skip regex entirely
  if (typeof str === 'number') {
    if (!isFinite(str)) return false;
    options = options || {};
    return (
      (!options.hasOwnProperty('min') || options.min == null || str >= options.min) &&
      (!options.hasOwnProperty('max') || options.max == null || str <= options.max) &&
      (!options.hasOwnProperty('lt') || options.lt == null || str < options.lt) &&
      (!options.hasOwnProperty('gt') || options.gt == null || str > options.gt)
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
    (!options.hasOwnProperty('min') || options.min == null || value >= options.min) &&
    (!options.hasOwnProperty('max') || options.max == null || value <= options.max) &&
    (!options.hasOwnProperty('lt') || options.lt == null || value < options.lt) &&
    (!options.hasOwnProperty('gt') || options.gt == null || value > options.gt)
  );
}

export const locales = Object.keys(decimal);
