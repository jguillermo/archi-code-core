import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

const INTEGER_FORMAT = /^-?\d+$/;

/**
 * Converts to an integer (numbers, or trimmed decimal strings `-?\d+`).
 * Non-integers → `{ ok: false, error: INTEGER }`; integers beyond ±Number.MAX_SAFE_INTEGER (a JS number
 * cannot hold them exactly) → `{ ok: false, error: INTEGER_OVERFLOW }`.
 */
export function toInteger(v: unknown): Converted<number> {
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
