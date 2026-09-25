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
  if (!regex.test(s)) return false;

  // Beyond Number.MAX_SAFE_INTEGER `Number(s)` rounds, so bounds are compared exactly with BigInt.
  const sNum = Number(s);
  const sBig = Number.isSafeInteger(sNum) ? undefined : BigInt(s);
  const compare = (bound: number): number => {
    if (sBig !== undefined && Number.isInteger(bound)) {
      const b = BigInt(bound);
      return sBig < b ? -1 : sBig > b ? 1 : 0;
    }
    return sNum < bound ? -1 : sNum > bound ? 1 : 0;
  };
  return (
    (options.min == null || compare(options.min) >= 0) &&
    (options.max == null || compare(options.max) <= 0) &&
    (options.lt == null || compare(options.lt) < 0) &&
    (options.gt == null || compare(options.gt) > 0)
  );
}
