import { merge } from './util/merge';
import { toString } from '../convert/string';
import { escapeRegExp } from './util/escapeRegExp';
import { BoundedCache } from './util/boundedCache';
import { ValidationConfigError } from './util/errors';

export interface IsCurrencyOptions {
  symbol?: string;
  require_symbol?: boolean;
  allow_space_after_symbol?: boolean;
  symbol_after_digits?: boolean;
  allow_negatives?: boolean;
  parens_for_negatives?: boolean;
  negative_sign_before_digits?: boolean;
  negative_sign_after_digits?: boolean;
  allow_negative_sign_placeholder?: boolean;
  thousands_separator?: string;
  decimal_separator?: string;
  allow_decimal?: boolean;
  require_decimal?: boolean;
  digits_after_decimal?: number[];
  allow_space_after_digits?: boolean;
}

function currencyRegex(options: Required<IsCurrencyOptions>): RegExp {
  let decimal_digits = `\\d{${options.digits_after_decimal[0]}}`;
  options.digits_after_decimal.forEach((digit, index) => {
    if (index !== 0) decimal_digits = `${decimal_digits}|\\d{${digit}}`;
  });

  const symbol = `(${escapeRegExp(options.symbol)})${options.require_symbol ? '' : '?'}`,
    negative = '-?',
    whole_dollar_amount_without_sep = '[1-9]\\d*',
    whole_dollar_amount_with_sep = `[1-9]\\d{0,2}(${escapeRegExp(options.thousands_separator)}\\d{3})*`,
    valid_whole_dollar_amounts = [
      '0',
      whole_dollar_amount_without_sep,
      whole_dollar_amount_with_sep,
    ],
    whole_dollar_amount = `(${valid_whole_dollar_amounts.join('|')})?`,
    decimal_amount = `(${escapeRegExp(options.decimal_separator)}(${decimal_digits}))${options.require_decimal ? '' : '?'}`;
  let pattern =
    whole_dollar_amount + (options.allow_decimal || options.require_decimal ? decimal_amount : '');

  // default is negative sign before symbol, but there are two other options (besides parens)
  if (options.allow_negatives && !options.parens_for_negatives) {
    if (options.negative_sign_after_digits) {
      pattern += negative;
    } else if (options.negative_sign_before_digits) {
      pattern = negative + pattern;
    }
  }

  // South African Rand, for example, uses R 123 (space) and R-123 (no space)
  if (options.allow_negative_sign_placeholder) {
    pattern = `( (?!\\-))?${pattern}`;
  } else if (options.allow_space_after_symbol) {
    pattern = ` ?${pattern}`;
  } else if (options.allow_space_after_digits) {
    pattern += '( (?!$))?';
  }

  if (options.symbol_after_digits) {
    pattern += symbol;
  } else {
    pattern = symbol + pattern;
  }

  if (options.allow_negatives) {
    if (options.parens_for_negatives) {
      pattern = `(\\(${pattern}\\)|${pattern})`;
    } else if (!(options.negative_sign_before_digits || options.negative_sign_after_digits)) {
      pattern = negative + pattern;
    }
  }

  // ensure there's a dollar and/or decimal amount, and that
  // it doesn't start with a space or a negative sign followed by a space
  return new RegExp(`^(?!-? )(?=.*\\d)${pattern}$`);
}

const default_currency_options = {
  symbol: '$',
  require_symbol: false,
  allow_space_after_symbol: false,
  symbol_after_digits: false,
  allow_negatives: true,
  parens_for_negatives: false,
  negative_sign_before_digits: false,
  negative_sign_after_digits: false,
  allow_negative_sign_placeholder: false,
  thousands_separator: ',',
  decimal_separator: '.',
  allow_decimal: true,
  require_decimal: false,
  digits_after_decimal: [2],
  allow_space_after_digits: false,
};

// Compiling the currency regex is expensive; cache it keyed by the option values
// that influence the pattern so repeated calls with the same options reuse it.
const currencyRegexCache = new BoundedCache<RegExp>();

function assertValidOptions(options: Required<IsCurrencyOptions>): void {
  for (const key of ['symbol', 'thousands_separator', 'decimal_separator'] as const) {
    if (typeof options[key] !== 'string')
      throw new ValidationConfigError(`${key} must be a string`);
  }
  const digits = options.digits_after_decimal;
  if (
    !Array.isArray(digits) ||
    digits.length === 0 ||
    !digits.every((d) => Number.isInteger(d) && d >= 0)
  ) {
    throw new ValidationConfigError(
      'digits_after_decimal must be a non-empty array of non-negative integers',
    );
  }
}

function getCurrencyRegex(options: Required<IsCurrencyOptions>): RegExp {
  assertValidOptions(options);
  // JSON keeps the key unambiguous whatever characters symbol/separators contain.
  const key = JSON.stringify([
    options.symbol,
    options.require_symbol,
    options.allow_space_after_symbol,
    options.symbol_after_digits,
    options.allow_negatives,
    options.parens_for_negatives,
    options.negative_sign_before_digits,
    options.negative_sign_after_digits,
    options.allow_negative_sign_placeholder,
    options.thousands_separator,
    options.decimal_separator,
    options.allow_decimal,
    options.require_decimal,
    options.digits_after_decimal,
    options.allow_space_after_digits,
  ]);
  return currencyRegexCache.getOrCreate(key, () => currencyRegex(options));
}

export function isCurrency(str: unknown, options?: IsCurrencyOptions): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const opts = merge(options, default_currency_options) as Required<IsCurrencyOptions>;
  return getCurrencyRegex(opts).test(s);
}
