import tryToString from './util/tryToString';

/* Based on https://tools.ietf.org/html/rfc3339#section-5.6 */

const dateFullYear = /[0-9]{4}/;
const dateMonth = /(0[1-9]|1[0-2])/;
const dateMDay = /([12]\d|0[1-9]|3[01])/;

const timeHour = /([01][0-9]|2[0-3])/;
const timeMinute = /[0-5][0-9]/;
const timeSecond = /([0-5][0-9]|60)/;

const timeSecFrac = /(\.[0-9]+)?/;
const timeNumOffset = new RegExp(`[-+]${timeHour.source}:${timeMinute.source}`);
const timeOffset = new RegExp(`([zZ]|${timeNumOffset.source})`);

const partialTime = new RegExp(
  `${timeHour.source}:${timeMinute.source}:${timeSecond.source}${timeSecFrac.source}`,
);

const fullDate = new RegExp(`${dateFullYear.source}-${dateMonth.source}-${dateMDay.source}`);
const fullTime = new RegExp(`${partialTime.source}${timeOffset.source}`);

const rfc3339 = new RegExp(`^${fullDate.source}[ tT]${fullTime.source}$`);

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Rejects dates that match the syntax but do not exist in the calendar (e.g. 2024-02-30). */
function isRealCalendarDate(str: string): boolean {
  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(5, 7));
  const day = Number(str.slice(8, 10));
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return day <= (month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]);
}

export default function isRFC3339(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  return rfc3339.test(s) && isRealCalendarDate(s);
}
