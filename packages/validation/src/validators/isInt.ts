import type { IsIntOptions } from '../types';
import tryToString from './util/tryToString';

const int = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
const intLeadingZeroes = /^[-+]?[0-9]+$/;

export default function isInt(str: unknown, options?: IsIntOptions): boolean {
  // Fast path: native integer — skip regex entirely
  if (typeof str === 'number') {
    if (!Number.isInteger(str)) return false;
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
  const regex = options.allow_leading_zeroes === false ? int : intLeadingZeroes;
  const sNum = Number(s);
  const minCheckPassed =
    !Object.prototype.hasOwnProperty.call(options, 'min') ||
    options.min == null ||
    sNum >= options.min;
  const maxCheckPassed =
    !Object.prototype.hasOwnProperty.call(options, 'max') ||
    options.max == null ||
    sNum <= options.max;
  const ltCheckPassed =
    !Object.prototype.hasOwnProperty.call(options, 'lt') || options.lt == null || sNum < options.lt;
  const gtCheckPassed =
    !Object.prototype.hasOwnProperty.call(options, 'gt') || options.gt == null || sNum > options.gt;
  return regex.test(s) && minCheckPassed && maxCheckPassed && ltCheckPassed && gtCheckPassed;
}
