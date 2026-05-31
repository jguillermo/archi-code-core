import assertString from './util/assertString';
import isNullOrUndefined from './util/nullUndefinedCheck';
import { decimal } from './alpha';
import coerceToString from './util/coerceToString';

export default function isFloat(str: unknown, options?) {
  // Fast path: native number — skip regex entirely
  if (typeof str === 'number') {
    if (!isFinite(str)) return false;
    options = options || {};
    return (
      (!options.hasOwnProperty('min') || isNullOrUndefined(options.min) || str >= options.min) &&
      (!options.hasOwnProperty('max') || isNullOrUndefined(options.max) || str <= options.max) &&
      (!options.hasOwnProperty('lt') || isNullOrUndefined(options.lt) || str < options.lt) &&
      (!options.hasOwnProperty('gt') || isNullOrUndefined(options.gt) || str > options.gt)
    );
  }
  // Non-string: coerce if possible, otherwise reject
  const s = coerceToString(str);
  if (s === false) return false;
  assertString(s);
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
    (!options.hasOwnProperty('min') || isNullOrUndefined(options.min) || value >= options.min) &&
    (!options.hasOwnProperty('max') || isNullOrUndefined(options.max) || value <= options.max) &&
    (!options.hasOwnProperty('lt') || isNullOrUndefined(options.lt) || value < options.lt) &&
    (!options.hasOwnProperty('gt') || isNullOrUndefined(options.gt) || value > options.gt)
  );
}

export const locales = Object.keys(decimal);
