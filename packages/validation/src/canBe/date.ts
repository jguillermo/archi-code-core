import { toDate } from '../convert/date';

/**
 * Valid `Date` instances and real calendar dates in the default `toDate` format (`YYYY/MM/DD`,
 * delimiters `/` or `-`, date part only — the rule ported from `isDate`).
 * @see toDate
 */
export function canBeDate(v: unknown): boolean {
  return toDate(v).ok;
}
