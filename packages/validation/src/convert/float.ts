import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

/**
 * Plain decimal notation only (optional sign, fraction and exponent). `Number()` alone would
 * also accept hexadecimal/binary/octal literals (`'0x10'`, `'0b101'`, `'0o7'`).
 */
const FLOAT_FORMAT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export function toFloat(v: unknown): Converted<number> {
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
