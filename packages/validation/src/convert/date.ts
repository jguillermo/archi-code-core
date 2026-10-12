import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

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

function pinZonelessTimeToUtc(
  isoText: string,
  time: string | undefined,
  zone: string | undefined,
): string {
  return time !== undefined && zone === undefined ? `${isoText}Z` : isoText;
}

export interface DateConvertOptions {
  format?: string;
  delimiters?: string[];
  strictMode?: boolean;
  twoDigitYearPivot?: number;
  iso?: boolean;
  lax?: boolean;
}

const DATE_FORMAT =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

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

  return validInstant(new Date(pinZonelessTimeToUtc(v.replace(' ', 'T'), m[4], m[8])));
}

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
    return validInstant(new Date(pinZonelessTimeToUtc(v, m[4], m[7])));
  }

  if (DATE_TO_STRING.test(v) || DATE_TO_UTC_STRING.test(v)) return validInstant(new Date(v));
  return failure(ConvertMessages.DATE);
}

const default_date_options = {
  format: 'YYYY/MM/DD',
  delimiters: ['/', '-'],
  strictMode: false,
};

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

function withDefaults(
  options: DateConvertOptions | undefined,
): DateConvertOptions & typeof default_date_options {
  const merged: Record<string, unknown> = { ...options };
  for (const key of Object.keys(default_date_options) as (keyof typeof default_date_options)[]) {
    if (merged[key] === undefined) merged[key] = default_date_options[key];
  }
  return merged as unknown as DateConvertOptions & typeof default_date_options;
}

function currentTwoDigitYear(): number {
  return new Date().getFullYear() % 100;
}

function toDateByFormat(input: unknown, options: DateConvertOptions | undefined): Converted<Date> {
  const mergedOptions = withDefaults(options);

  if (typeof input === 'string' && isValidFormat(mergedOptions.format)) {
    if (mergedOptions.strictMode && input.length !== mergedOptions.format.length) {
      return failure(ConvertMessages.DATE);
    }
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

    if (fullYear.startsWith('-')) {
      return failure(ConvertMessages.DATE);
    }

    if (dateObj.y.length === 2) {
      const parsedYear = parseInt(dateObj.y, 10);

      if (isNaN(parsedYear)) {
        return failure(ConvertMessages.DATE);
      }

      const pivot = mergedOptions.twoDigitYearPivot ?? currentTwoDigitYear();

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
