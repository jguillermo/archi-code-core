import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

const DATE_FORMAT =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

/**
 * Accepts valid `Date` instances and ISO 8601 strings `YYYY-MM-DD[(T| )HH:mm:ss[.fff][Z|±HH:mm]]`
 * whose calendar values really exist (no silent roll-over such as Feb 30 → Mar 1).
 *
 * Time zone rule (deterministic on every machine): a string WITHOUT an explicit zone is
 * interpreted as UTC — both date-only and date-time forms.
 */
export function toDate(v: unknown): Converted<Date> {
  if (v instanceof Date) return isNaN(v.getTime()) ? failure(ConvertMessages.DATE) : success(v);
  if (typeof v !== 'string') return failure(ConvertMessages.DATE);

  const m = DATE_FORMAT.exec(v);
  if (m === null) return failure(ConvertMessages.DATE);

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    return failure(ConvertMessages.DATE);

  const hasTime = m[4] !== undefined;
  if (hasTime) {
    if (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6]) > 59)
      return failure(ConvertMessages.DATE);
    const zone = m[8];
    if (
      zone !== undefined &&
      zone !== 'Z' &&
      (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)
    ) {
      return failure(ConvertMessages.DATE);
    }
  }

  let iso = v.replace(' ', 'T');
  if (hasTime && m[8] === undefined) iso += 'Z';
  const d = new Date(iso);
  // istanbul ignore next -- defensive: every string reaching here is a valid ISO instant.
  if (isNaN(d.getTime())) return failure(ConvertMessages.DATE);
  return success(d);
}
