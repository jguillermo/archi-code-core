import { toString } from '../convert/string';
import { optionsOf } from '../helpers/config';

export interface IsISO8601Options {
  /** Also reject dates that do not exist in the calendar (e.g. 2024-02-30). */
  strict?: boolean;
  /** Only accept `T` as date/time separator. */
  strictSeparator?: boolean;
}

// from http://goo.gl/0ejHHW
const iso8601 =
  /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
// same as above, except with a strict 'T' separator between date and time
const iso8601StrictSeparator =
  /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;

const isValidDate = (str: string): boolean => {
  // str must have passed the ISO8601 check
  // this check is meant to catch invalid dates
  // like 2009-02-31
  // first check for ordinal dates
  const ordinalMatch = str.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/);
  if (ordinalMatch) {
    const oYear = Number(ordinalMatch[1]);
    const oDay = Number(ordinalMatch[2]);
    // if is leap year
    if ((oYear % 4 === 0 && oYear % 100 !== 0) || oYear % 400 === 0) return oDay <= 366;
    return oDay <= 365;
  }
  const match = (str.match(/(\d{4})-?(\d{0,2})-?(\d*)/) as RegExpMatchArray).map(Number);
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const monthString = month ? `0${month}`.slice(-2) : month;
  const dayString = day ? `0${day}`.slice(-2) : day;

  // create a date object and compare. The year is re-padded to 4 digits: `new Date('50-01-31')`
  // would read year 50 as 1950/2050 and reject every valid date of years 0000-0099.
  const yearString = `000${year}`.slice(-4);
  const d = new Date(`${yearString}-${monthString || '01'}-${dayString || '01'}`);
  if (month && day) {
    return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
  }
  return true;
};

/**
 * ISO 8601 syntax check. By default only the SYNTAX is validated (e.g. `2024-02-30` passes),
 * which is the historic validator.js behaviour. Pass `{ strict: true }` to also reject dates
 * that do not exist in the calendar.
 */
export function isISO8601(input: unknown, options?: IsISO8601Options): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  const opts = optionsOf(options);
  const check = opts.strictSeparator ? iso8601StrictSeparator.test(str) : iso8601.test(str);
  if (check && opts.strict) return isValidDate(str);
  return check;
}
