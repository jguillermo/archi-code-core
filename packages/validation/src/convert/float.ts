import { toString } from './string';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

// `Number()` alone would also accept hexadecimal, binary and octal literals (`'0x10'`).
const PLAIN_DECIMAL_FORMAT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export interface FloatConvertOptions {
  syntax?: 'default' | 'validator';
  decimalSeparator?: string;
}

const validatorFloatRegex = new Map<string, RegExp>();
const MAX_CACHED_SEPARATORS = 64;

function getValidatorFloatRegex(separator: string): RegExp {
  let re = validatorFloatRegex.get(separator);
  if (re === undefined) {
    const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
    re = new RegExp(
      `^(?:[-+])?(?:[0-9]+)?(?:${escapedSeparator}[0-9]*)?(?:[eE][\\+\\-]?(?:[0-9]+))?$`,
    );
    if (validatorFloatRegex.size < MAX_CACHED_SEPARATORS) validatorFloatRegex.set(separator, re);
  }
  return re;
}

const VALIDATOR_REJECTED = ['', '.', ',', '-', '+'];

export function toFloat(v: unknown, options?: FloatConvertOptions): Converted<number> {
  if (options?.syntax === 'validator')
    return toFloatValidatorSyntax(v, options.decimalSeparator ?? '.');
  if (typeof v === 'number')
    return Number.isFinite(v) ? success(v) : failure(ConvertMessages.FLOAT);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!PLAIN_DECIMAL_FORMAT.test(s)) return failure(ConvertMessages.FLOAT);
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
