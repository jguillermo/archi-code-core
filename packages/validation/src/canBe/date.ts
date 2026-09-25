import { toDate } from '../convert/date';

/**
 * Valid `Date` instances and real calendar ISO 8601 strings. Strings without a zone are UTC.
 * @see toDate
 */
export function canBeDate(v: unknown): boolean {
  return toDate(v).ok;
}
