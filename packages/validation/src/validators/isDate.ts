import { toDate } from '../convert/date';
import { optionsOf } from '../helpers/config';

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
export function isDate(value: unknown, options?: IsDateOptions): boolean {
  return toDate(value, optionsOf(options)).ok;
}
