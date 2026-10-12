import { toString } from './string';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

const INTEGER_FORMAT = /^-?\d+$/;
const VALIDATOR_INT = /^(?:[-+]?(?:0|[1-9][0-9]*))$/;
const VALIDATOR_INT_LEADING_ZEROES = /^[-+]?[0-9]+$/;

export interface IntegerConvertOptions {
  syntax?: 'default' | 'validator';
  allowLeadingZeroes?: boolean;
}

export function toInteger(v: unknown, options?: IntegerConvertOptions): Converted<number> {
  if (options?.syntax === 'validator') return toIntegerValidatorSyntax(v, options);
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) return failure(ConvertMessages.INTEGER);
    if (!Number.isSafeInteger(v)) return failure(ConvertMessages.INTEGER_OVERFLOW);
    return success(v);
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!INTEGER_FORMAT.test(s)) return failure(ConvertMessages.INTEGER);
    const n = Number(s);
    if (!Number.isSafeInteger(n)) return failure(ConvertMessages.INTEGER_OVERFLOW);
    return success(n);
  }
  return failure(ConvertMessages.INTEGER);
}

function toIntegerValidatorSyntax(v: unknown, options: IntegerConvertOptions): Converted<number> {
  if (typeof v === 'number')
    return Number.isInteger(v) ? success(v) : failure(ConvertMessages.INTEGER);
  const str = toString(v);
  if (!str.ok) return failure(ConvertMessages.INTEGER);
  const regex = options.allowLeadingZeroes === false ? VALIDATOR_INT : VALIDATOR_INT_LEADING_ZEROES;
  if (!regex.test(str.value)) return failure(ConvertMessages.INTEGER);
  const n = Number(str.value);
  return Number.isFinite(n) ? success(n) : failure(ConvertMessages.INTEGER_OVERFLOW);
}
