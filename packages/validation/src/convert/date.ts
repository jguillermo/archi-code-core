import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

// ─── calendar ────────────────────────────────────────────────────────────────

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * True when year/month/day is a date that exists in the Gregorian calendar (no roll-over such as
 * Feb 30 → Mar 1). The single calendar rule of the package — validators reuse it.
 */
export function isCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= (month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]);
}

function validTime(
  hour: string | undefined,
  minute: string | undefined,
  second: string | undefined,
): boolean {
  return Number(hour ?? 0) <= 23 && Number(minute ?? 0) <= 59 && Number(second ?? 0) <= 59;
}

function validZone(zone: string | undefined): boolean {
  return (
    zone === undefined ||
    zone === 'Z' ||
    (Number(zone.slice(1, 3)) <= 23 && Number(zone.slice(4, 6)) <= 59)
  );
}

function validInstant(d: Date): Converted<Date> {
  return isNaN(d.getTime()) ? failure(ConvertMessages.DATE) : success(d);
}

// ─── options ─────────────────────────────────────────────────────────────────

export interface DateConvertOptions {
  /**
   * Day/month/year FORMAT used by the default rule, e.g. `'YYYY/MM/DD'` (default) or `'DD-MM-YY'`.
   * The default rule is the logic PORTED FROM `validator.isDate` (see {@link toDate}).
   */
  format?: string;
  /** Accepted delimiters (default `['/', '-']`). */
  delimiters?: string[];
  /** The input must have exactly the format's length and delimiter; Date instances are rejected. */
  strictMode?: boolean;
  /** Two-digit years below this are 20YY, the rest 19YY (default: current year % 100). */
  twoDigitYearPivot?: number;
  /**
   * ISO 8601 rule — the converter's former default. NOT compatible with the isDate-based default:
   * reads `YYYY-MM-DD[(T| )HH:mm:ss[.fff][Z|±HH:mm]]` (time and zone included; no zone = UTC) and
   * ignores `format`/`delimiters`/`strictMode`.
   */
  iso?: boolean;
  /**
   * Lenient deterministic parsing — rule PORTED FROM `validator.isAfter` / `isBefore` (formerly
   * `validators/util/parseDateLax`). NOT compatible with the default: also accepts reduced ISO
   * precision (`'2024'`, `'2024-03'`, `'2024-03-05T10:20'`) and the output of `Date#toString()` /
   * `Date#toUTCString()`. Engine-dependent formats such as `'01/02/2024'` are still rejected.
   */
  lax?: boolean;
}

// ─── ISO rule ────────────────────────────────────────────────────────────────

const DATE_FORMAT =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Converts to a Date. DEFAULT RULE = the logic PORTED FROM `validator.isDate` (moved here so the
 * validator no longer duplicates date parsing): the string is read by `format` (default
 * `'YYYY/MM/DD'`) with interchangeable `delimiters` (default `/` and `-`), only the date part is
 * read and the result is that day at 00:00 UTC. Valid `Date` instances are accepted unless
 * `strictMode`. This default is NOT compatible with the converter's former ISO rule
 * (`'2024-01-31T10:00:00'` is no longer accepted) — that rule remains available as `{ iso: true }`;
 * `{ lax: true }` is the rule ported from `isAfter`/`isBefore`.
 */
export function toDate(v: unknown, options?: DateConvertOptions): Converted<Date> {
  try {
    if (options?.lax) return toDateLax(v);
    if (options?.iso) return toDateIso(v);
    return toDateByFormat(v, options);
  } catch {
    // Hostile values (revoked proxies, throwing getters) make even `instanceof` throw.
    return failure(ConvertMessages.DATE);
  }
}

/**
 * ISO rule (`options.iso`): valid `Date` instances and ISO 8601 strings
 * `YYYY-MM-DD[(T| )HH:mm:ss[.fff][Z|±HH:mm]]` whose calendar values really exist. A string WITHOUT
 * an explicit zone is interpreted as UTC (deterministic on every machine).
 */
function toDateIso(v: unknown): Converted<Date> {
  if (v instanceof Date) return validInstant(v);
  if (typeof v !== 'string') return failure(ConvertMessages.DATE);

  const m = DATE_FORMAT.exec(v);
  if (m === null) return failure(ConvertMessages.DATE);
  if (!isCalendarDate(Number(m[1]), Number(m[2]), Number(m[3])))
    return failure(ConvertMessages.DATE);

  const hasTime = m[4] !== undefined;
  if (hasTime && (!validTime(m[4], m[5], m[6]) || !validZone(m[8])))
    return failure(ConvertMessages.DATE);

  let iso = v.replace(' ', 'T');
  if (hasTime && m[8] === undefined) iso += 'Z';
  return validInstant(new Date(iso));
}

// ─── lax rule (ported from isAfter / isBefore) ───────────────────────────────

const ISO_DATE_TIME =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const DATE_TO_STRING =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{2} -?\d{4,6} \d{2}:\d{2}:\d{2} GMT[+-](?:[01]\d|2[0-3])[0-5]\d(?: \(.+\))?$/;
const DATE_TO_UTC_STRING =
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) -?\d{4,6} \d{2}:\d{2}:\d{2} GMT$/;

function toDateLax(v: unknown): Converted<Date> {
  if (v instanceof Date) return validInstant(v);
  if (typeof v !== 'string') return failure(ConvertMessages.DATE);

  const m = ISO_DATE_TIME.exec(v);
  if (m !== null) {
    const month = m[2] === undefined ? 1 : Number(m[2]);
    const day = m[3] === undefined ? 1 : Number(m[3]);
    if (!isCalendarDate(Number(m[1]), month, day)) return failure(ConvertMessages.DATE);
    if (!validTime(m[4], m[5], m[6]) || !validZone(m[7])) return failure(ConvertMessages.DATE);
    // Time part without zone → force UTC so the result is machine-independent.
    return validInstant(new Date(m[4] !== undefined && m[7] === undefined ? `${v}Z` : v));
  }

  if (DATE_TO_STRING.test(v) || DATE_TO_UTC_STRING.test(v)) return validInstant(new Date(v));
  return failure(ConvertMessages.DATE);
}

// ─── default rule: format (ported from isDate) ───────────────────────────────

const default_date_options = {
  format: 'YYYY/MM/DD',
  delimiters: ['/', '-'],
  strictMode: false,
};

// Hoisted to module scope so the regex is compiled once rather than on every call.
// The `g` flag is intentionally omitted: with a shared regex instance it would make
// `.test()` stateful (advancing lastIndex) and produce wrong results across calls.
const validFormatRegex =
  /(^(y{4}|y{2})[./-](m{1,2})[./-](d{1,2})$)|(^(m{1,2})[./-](d{1,2})[./-]((y{4}|y{2})$))|(^(d{1,2})[./-](m{1,2})[./-]((y{4}|y{2})$))/i;

function isValidFormat(format: string): boolean {
  return validFormatRegex.test(format);
}

function zip(date: string[], format: string[]): [string, string][] {
  const zippedArr: [string, string][] = [],
    len = Math.max(date.length, format.length);

  for (let i = 0; i < len; i++) {
    zippedArr.push([date[i], format[i]]);
  }

  return zippedArr;
}

/** Fills the options left undefined with the isDate defaults (same semantics as validators' merge). */
function withDefaults(
  options: DateConvertOptions | undefined,
): DateConvertOptions & typeof default_date_options {
  const merged: Record<string, unknown> = { ...options };
  for (const key of Object.keys(default_date_options) as (keyof typeof default_date_options)[]) {
    if (merged[key] === undefined) merged[key] = default_date_options[key];
  }
  return merged as unknown as DateConvertOptions & typeof default_date_options;
}

function toDateByFormat(input: unknown, options: DateConvertOptions | undefined): Converted<Date> {
  const mergedOptions = withDefaults(options);

  if (typeof input === 'string' && isValidFormat(mergedOptions.format)) {
    if (mergedOptions.strictMode && input.length !== mergedOptions.format.length) {
      return failure(ConvertMessages.DATE);
    }
    // Garbage `delimiters`, or a format whose delimiter is not one of them (e.g. 'YYYY.MM.DD' with
    // the default ['/', '-']), can never match: fail instead of throwing (converters never throw).
    if (!Array.isArray(mergedOptions.delimiters)) return failure(ConvertMessages.DATE);
    const formatDelimiter = mergedOptions.delimiters.find(
      (delimiter) => mergedOptions.format.indexOf(delimiter) !== -1,
    );
    if (formatDelimiter === undefined) return failure(ConvertMessages.DATE);
    const dateDelimiter = mergedOptions.strictMode
      ? formatDelimiter
      : mergedOptions.delimiters.find((delimiter) => input.indexOf(delimiter) !== -1);
    const dateAndFormat = zip(
      input.split(dateDelimiter as string),
      mergedOptions.format.toLowerCase().split(formatDelimiter),
    );
    const dateObj: Record<string, string> = {};

    for (const [dateWord, formatWord] of dateAndFormat) {
      if (!dateWord || !formatWord || dateWord.length !== formatWord.length) {
        return failure(ConvertMessages.DATE);
      }

      dateObj[formatWord.charAt(0)] = dateWord;
    }

    let fullYear = dateObj.y;

    // Check if the year starts with a hyphen
    if (fullYear.startsWith('-')) {
      return failure(ConvertMessages.DATE); // Hyphen before year is not allowed
    }

    if (dateObj.y.length === 2) {
      const parsedYear = parseInt(dateObj.y, 10);

      if (isNaN(parsedYear)) {
        return failure(ConvertMessages.DATE);
      }

      // Two-digit years below the pivot are 20xx, the rest 19xx. The default pivot (current year's
      // last two digits) makes results drift over time; pass `twoDigitYearPivot` for stable output.
      const pivot = mergedOptions.twoDigitYearPivot ?? new Date().getFullYear() % 100;

      if (parsedYear < pivot) {
        fullYear = `20${dateObj.y}`;
      } else {
        fullYear = `19${dateObj.y}`;
      }
    }

    let month = dateObj.m;

    if (dateObj.m.length === 1) {
      month = `0${dateObj.m}`;
    }

    let day = dateObj.d;

    if (dateObj.d.length === 1) {
      day = `0${dateObj.d}`;
    }

    const date = new Date(`${fullYear}-${month}-${day}T00:00:00.000Z`);
    return date.getUTCDate() === +dateObj.d ? success(date) : failure(ConvertMessages.DATE);
  }

  if (!mergedOptions.strictMode) {
    return Object.prototype.toString.call(input) === '[object Date]' && isFinite(input as number)
      ? success(input as Date)
      : failure(ConvertMessages.DATE);
  }

  return failure(ConvertMessages.DATE);
}
