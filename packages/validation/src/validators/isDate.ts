import { toDate } from '../convert/date';

export interface IsDateOptions {
  format?: string;
  strictMode?: boolean;
  delimiters?: string[];
  /**
   * Two-digit years (`YY`) below this value are read as 20YY, the rest as 19YY.
   * Default: the last two digits of the current year (result changes over time).
   */
  twoDigitYearPivot?: number;
}

/**
 * Date check by format (default `'YYYY/MM/DD'`, delimiters `/` and `-`). The rule lives in
 * `convert/date` — it is `toDate`'s default rule (ported from this validator).
 */
export default function isDate(input: unknown, options?: IsDateOptions | string): boolean {
  // Allow backward compatibility for old format isDate(input [, format])
  return toDate(input, typeof options === 'string' ? { format: options } : options).ok;
}
