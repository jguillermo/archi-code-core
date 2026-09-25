import { toFloat } from '../convert/float';
import { decimal } from './alpha';
import { toString } from '../convert/string';
import { ValidationConfigError } from './util/errors';
import { hasOwn } from './util/hasOwn';
import { configText } from './util/config';

export interface IsFloatOptions {
  min?: number;
  max?: number;
  lt?: number;
  gt?: number;
  locale?: string;
}

/**
 * Float check. The float syntax lives in `convert/float` (`syntax: 'validator'`, ported from this
 * validator); this function resolves the locale's decimal separator and adds the bounds.
 */
export function isFloat(str: unknown, options?: IsFloatOptions): boolean {
  const opts = options || {};
  if (typeof str !== 'number') {
    // Config errors are reported only for readable values (historic order of checks).
    if (!toString(str).ok) return false;
    if (opts.locale && !hasOwn(decimal, opts.locale)) {
      throw new ValidationConfigError(`Invalid locale '${configText(opts.locale)}'`);
    }
  }
  const decimalSeparator = opts.locale ? decimal[opts.locale] : '.';
  const r = toFloat(str, { syntax: 'validator', decimalSeparator });
  if (!r.ok) return false;
  const value = r.value;
  return (
    (opts.min == null || value >= opts.min) &&
    (opts.max == null || value <= opts.max) &&
    (opts.lt == null || value < opts.lt) &&
    (opts.gt == null || value > opts.gt)
  );
}

export const locales: readonly string[] = Object.freeze(Object.keys(decimal));
