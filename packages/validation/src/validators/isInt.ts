import tryToString from './util/tryToString';

const int = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
const intLeadingZeroes = /^[-+]?[0-9]+$/;

export default function isInt(str: unknown, options?): boolean {
  // Fast path: native integer — skip regex entirely
  if (typeof str === 'number') {
    if (!Number.isInteger(str)) return false;
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
  const regex = options.allow_leading_zeroes === false ? int : intLeadingZeroes;
  const minCheckPassed =
    !options.hasOwnProperty('min') || options.min == null || s >= options.min;
  const maxCheckPassed =
    !options.hasOwnProperty('max') || options.max == null || s <= options.max;
  const ltCheckPassed =
    !options.hasOwnProperty('lt') || options.lt == null || s < options.lt;
  const gtCheckPassed =
    !options.hasOwnProperty('gt') || options.gt == null || s > options.gt;
  return regex.test(s) && minCheckPassed && maxCheckPassed && ltCheckPassed && gtCheckPassed;
}
