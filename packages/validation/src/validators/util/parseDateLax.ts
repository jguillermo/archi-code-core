/**
 * Deterministic date parser used by `isAfter` / `isBefore`.
 *
 * `new Date(string)` is only specified by ECMAScript for a few formats; anything else
 * (e.g. `'01/02/2024'`) is engine-dependent and may even differ between runtimes. This parser
 * accepts exclusively the formats whose meaning is fixed:
 *
 *  - `Date` instances (when valid);
 *  - ISO 8601 date/date-time strings. A date-time WITHOUT an explicit zone is read as UTC, so
 *    the result never depends on the machine's time zone (same rule as `toDate`);
 *  - the output of `Date.prototype.toString()` (`'Sat Sep 10 2011 00:00:00 GMT+0200 (…)'`) and
 *    `Date.prototype.toUTCString()` (`'Sat, 10 Sep 2011 00:00:00 GMT'`), which carry their offset.
 *
 * Returns `undefined` for anything else.
 */

const ISO_DATE_TIME =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const DATE_TO_STRING =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{2} -?\d{4,6} \d{2}:\d{2}:\d{2} GMT[+-](?:[01]\d|2[0-3])[0-5]\d(?: \(.+\))?$/;
const DATE_TO_UTC_STRING =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) -?\d{4,6} \d{2}:\d{2}:\d{2} GMT$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validDate(d: Date): Date | undefined {
  return isNaN(d.getTime()) ? undefined : d;
}

export default function parseDateLax(v: unknown): Date | undefined {
  if (v instanceof Date) return validDate(v);
  if (typeof v !== 'string') return undefined;

  const m = ISO_DATE_TIME.exec(v);
  if (m !== null) {
    const year = Number(m[1]);
    const month = m[2] === undefined ? 1 : Number(m[2]);
    const day = m[3] === undefined ? 1 : Number(m[3]);
    if (month < 1 || month > 12) return undefined;
    const maxDay = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
    if (day < 1 || day > maxDay) return undefined;
    if (m[4] !== undefined && (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6] ?? 0) > 59)) {
      return undefined;
    }
    const zone = m[7];
    if (
      zone !== undefined &&
      zone !== 'Z' &&
      (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59)
    ) {
      return undefined;
    }
    // Time part without zone → force UTC so the result is machine-independent.
    return validDate(new Date(m[4] !== undefined && zone === undefined ? `${v}Z` : v));
  }

  if (DATE_TO_STRING.test(v) || DATE_TO_UTC_STRING.test(v)) {
    return validDate(new Date(v));
  }

  return undefined;
}
