import { isDate } from './criteria-value';

const DECIMAL = /^-?\d+(\.\d+)?$/;
const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2})))?$/;
const MINUTE = 60_000;

function validDate(time: number): Date | null {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDate(text: string): Date | null {
  const match = ISO_DATE.exec(text);
  if (match === null) {
    return null;
  }
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((part) => Number(part ?? 0));
  const millisecond = Number((match[7] ?? '0').padEnd(3, '0'));
  const offsetHours = Number(match[10] ?? 0);
  const offsetMinutes = Number(match[11] ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutes > 59) {
    return null;
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const offset = (match[9] === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes);
  return validDate(date.getTime() - offset * MINUTE);
}

export function parseDate(value: unknown): Date | null {
  if (isDate(value)) {
    return validDate(value.getTime());
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? validDate(value) : null;
  }
  return typeof value === 'string' ? parseIsoDate(value) : null;
}
