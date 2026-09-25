import { toInteger } from '../convert/integer';
import { toString } from '../convert/string';

export interface IsIntOptions {
  min?: number;
  max?: number;
  lt?: number;
  gt?: number;
  allow_leading_zeroes?: boolean;
}

/**
 * Integer check. The integer syntax lives in `convert/integer` (`syntax: 'validator'`, ported from
 * this validator); this function only adds the bounds (`min`/`max`/`lt`/`gt`).
 */
export default function isInt(str: unknown, options?: IsIntOptions): boolean {
  const opts = options || {};
  const r = toInteger(str, { syntax: 'validator', allowLeadingZeroes: opts.allow_leading_zeroes });
  if (!r.ok) return false;

  // Beyond Number.MAX_SAFE_INTEGER the converted number is rounded, so bounds are compared
  // exactly with BigInt on the original text.
  const n = r.value;
  const text = typeof str === 'number' ? undefined : (toString(str).value as string);
  const big = text !== undefined && !Number.isSafeInteger(n) ? BigInt(text) : undefined;
  const compare = (bound: number): number => {
    if (big !== undefined && Number.isInteger(bound)) {
      const b = BigInt(bound);
      return big < b ? -1 : big > b ? 1 : 0;
    }
    return n < bound ? -1 : n > bound ? 1 : 0;
  };
  return (
    (opts.min == null || compare(opts.min) >= 0) &&
    (opts.max == null || compare(opts.max) <= 0) &&
    (opts.lt == null || compare(opts.lt) < 0) &&
    (opts.gt == null || compare(opts.gt) > 0)
  );
}
