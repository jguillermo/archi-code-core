import { toString } from './string';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

/**
 * Plain decimal notation only (optional sign, fraction and exponent). `Number()` alone would
 * also accept hexadecimal/binary/octal literals (`'0x10'`, `'0b101'`, `'0o7'`).
 */
const FLOAT_FORMAT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export interface FloatConvertOptions {
  /**
   * - `'default'`: finite numbers, or trimmed strings in plain decimal notation with `.`.
   * - `'validator'`: rule PORTED FROM `validator.isFloat`, moved here so the validator no longer
   *   duplicates the float rule. It is NOT compatible with the default: strings are not trimmed,
   *   the decimal separator is configurable, booleans/finite numbers are read through `toString`,
   *   and forms without digits (`'.e5'`, `'e5'`) or beyond the number range (`'1e400'`) fail:
   *   a successful result always holds a finite number.
   */
  syntax?: 'default' | 'validator';
  /** Only for `syntax: 'validator'`: decimal separator (isFloat resolves it from the locale). Default `'.'`. */
  decimalSeparator?: string;
}

// Compiled regex per decimal separator. The separator is escaped (it is caller-supplied) and the
// cache is capped so arbitrary separators cannot grow it without limit.
const validatorFloatRegex = new Map<string, RegExp>();
const MAX_CACHED_SEPARATORS = 64;

function getValidatorFloatRegex(separator: string): RegExp {
  let re = validatorFloatRegex.get(separator);
  if (re === undefined) {
    const sep = separator.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
    re = new RegExp(`^(?:[-+])?(?:[0-9]+)?(?:${sep}[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$`);
    if (validatorFloatRegex.size < MAX_CACHED_SEPARATORS) validatorFloatRegex.set(separator, re);
  }
  return re;
}

const VALIDATOR_REJECTED = ['', '.', ',', '-', '+'];

/** Converts to a finite number. Strings must use plain decimal notation (no `0x`/`0b`/`0o`). */
export function toFloat(v: unknown, options?: FloatConvertOptions): Converted<number> {
  if (options?.syntax === 'validator')
    return toFloatValidatorSyntax(v, options.decimalSeparator ?? '.');
  if (typeof v === 'number')
    return Number.isFinite(v) ? success(v) : failure(ConvertMessages.FLOAT);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!FLOAT_FORMAT.test(s)) return failure(ConvertMessages.FLOAT);
    const n = Number(s);
    return Number.isFinite(n) ? success(n) : failure(ConvertMessages.FLOAT);
  }
  return failure(ConvertMessages.FLOAT);
}

function toFloatValidatorSyntax(v: unknown, separator: string): Converted<number> {
  if (typeof v === 'number') return isFinite(v) ? success(v) : failure(ConvertMessages.FLOAT);
  const str = toString(v);
  if (!str.ok) return failure(ConvertMessages.FLOAT);
  const s = str.value;
  if (VALIDATOR_REJECTED.includes(s) || !getValidatorFloatRegex(separator).test(s)) {
    return failure(ConvertMessages.FLOAT);
  }
  const n = parseFloat(separator === '' ? s : s.replace(separator, '.'));
  return Number.isFinite(n) ? success(n) : failure(ConvertMessages.FLOAT);
}
