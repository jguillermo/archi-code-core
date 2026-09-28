import { toFloat } from '../convert/float';
import { decimal } from './alpha';
import { toString } from '../convert/string';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { configText } from '../helpers/config';

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
export function isFloat(value: unknown, options?: IsFloatOptions): boolean {
  const opts = options || {};
  if (typeof value !== 'number') {
    // Config errors are reported only for readable values (historic order of checks).
    if (!toString(value).ok) return false;
    if (opts.locale && !hasOwn(decimal, opts.locale)) {
      throw new ValidationConfigError(`Invalid locale '${configText(opts.locale)}'`);
    }
  }
  const decimalSeparator = opts.locale ? decimal[opts.locale] : '.';
  const r = toFloat(value, { syntax: 'validator', decimalSeparator });
  if (!r.ok) return false;
  const n = r.value;
  return (
    (opts.min == null || n >= opts.min) &&
    (opts.max == null || n <= opts.max) &&
    (opts.lt == null || n < opts.lt) &&
    (opts.gt == null || n > opts.gt)
  );
}

export const locales: readonly string[] = Object.freeze(Object.keys(decimal));
