import assertString from './util/assertString';
import isNullOrUndefined from './util/nullUndefinedCheck';
import coerceToString from './util/coerceToString';

const int = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
const intLeadingZeroes = /^[-+]?[0-9]+$/;

export default function isInt(str: unknown, options?) {
  // Fast path: native integer — skip regex entirely
  if (typeof str === 'number') {
    if (!Number.isInteger(str)) return false;
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
  const regex = options.allow_leading_zeroes === false ? int : intLeadingZeroes;
  const minCheckPassed =
    !options.hasOwnProperty('min') || isNullOrUndefined(options.min) || s >= options.min;
  const maxCheckPassed =
    !options.hasOwnProperty('max') || isNullOrUndefined(options.max) || s <= options.max;
  const ltCheckPassed =
    !options.hasOwnProperty('lt') || isNullOrUndefined(options.lt) || s < options.lt;
  const gtCheckPassed =
    !options.hasOwnProperty('gt') || isNullOrUndefined(options.gt) || s > options.gt;
  return regex.test(s) && minCheckPassed && maxCheckPassed && ltCheckPassed && gtCheckPassed;
}
