import type { IsDecimalOptions } from '../types';
import { ValidationConfigError } from './util/errors';
import hasOwn from './util/hasOwn';
import merge from './util/merge';
import { toString } from '../convert/string';
import escapeRegExp from './util/escapeRegExp';
import BoundedCache from './util/boundedCache';
import { decimal } from './alpha';

// Cache the compiled regex keyed by the options that shape it, so repeated calls
// with the same options skip recompilation. Bounded: options may vary per request.
const decimalRegexCache = new BoundedCache<RegExp>();

// decimal_digits is interpolated into a regex quantifier: only 'n', 'n,' or 'n,m' are allowed.
const DECIMAL_DIGITS_FORMAT = /^\d+(,\d*)?$/;

function decimalRegExp(options: Required<IsDecimalOptions>): RegExp {
  const key = JSON.stringify([options.locale, options.decimal_digits, options.force_decimal]);
  return decimalRegexCache.getOrCreate(
    key,
    () =>
      new RegExp(
        `^[-+]?([0-9]+)?(${escapeRegExp(decimal[options.locale])}[0-9]{${options.decimal_digits}})${options.force_decimal ? '' : '?'}$`,
      ),
  );
}

const default_decimal_options = {
  force_decimal: false,
  decimal_digits: '1,',
  locale: 'en-US',
};

const blacklist = ['', '-', '+'];

export default function isDecimal(str: unknown, options?: IsDecimalOptions): boolean {
  const opts = merge(options, default_decimal_options) as Required<IsDecimalOptions>;
  // Historic API also accepts `locale: ['xx-YY']`; normalise like the former `in` lookup did.
  opts.locale = String(opts.locale);
  if (!hasOwn(decimal, opts.locale)) {
    throw new ValidationConfigError(`Invalid locale '${opts.locale}'`);
  }
  if (typeof opts.decimal_digits !== 'string' || !DECIMAL_DIGITS_FORMAT.test(opts.decimal_digits)) {
    throw new ValidationConfigError(`Invalid decimal_digits '${String(opts.decimal_digits)}'`);
  }
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  return !blacklist.includes(s.replace(/ /g, '')) && decimalRegExp(opts).test(s);
}
