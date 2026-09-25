import type { IsDateOptions } from '../types';
import { toDate } from '../convert/date';

/**
 * Date check by format (default `'YYYY/MM/DD'`, delimiters `/` and `-`). The rule lives in
 * `convert/date` — it is `toDate`'s default rule (ported from this validator).
 */
export default function isDate(input: unknown, options?: IsDateOptions | string): boolean {
  // Allow backward compatibility for old format isDate(input [, format])
  return toDate(input, typeof options === 'string' ? { format: options } : options).ok;
}
