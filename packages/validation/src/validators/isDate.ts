import type { IsDateOptions } from '../types';
import merge from './util/merge';

const default_date_options = {
  format: 'YYYY/MM/DD',
  delimiters: ['/', '-'],
  strictMode: false,
};

function isValidFormat(format) {
  return /(^(y{4}|y{2})[.\/-](m{1,2})[.\/-](d{1,2})$)|(^(m{1,2})[.\/-](d{1,2})[.\/-]((y{4}|y{2})$))|(^(d{1,2})[.\/-](m{1,2})[.\/-]((y{4}|y{2})$))/gi.test(
    format,
  );
}

function zip(date, format) {
  const zippedArr: [string, string][] = [],
    len = Math.max(date.length, format.length);

  for (let i = 0; i < len; i++) {
    zippedArr.push([date[i], format[i]]);
  }

  return zippedArr;
}

export default function isDate(input: unknown, options?: IsDateOptions | string): boolean {
  let mergedOptions: IsDateOptions & { format: string; delimiters: string[]; strictMode: boolean };
  if (typeof options === 'string') {
    // Allow backward compatibility for old format isDate(input [, format])
    mergedOptions = merge({ format: options }, default_date_options);
  } else {
    mergedOptions = merge(options, default_date_options);
  }
  if (typeof input === 'string' && isValidFormat(mergedOptions.format)) {
    if (mergedOptions.strictMode && input.length !== mergedOptions.format.length) return false;
    const formatDelimiter = mergedOptions.delimiters.find(
      (delimiter) => mergedOptions.format.indexOf(delimiter) !== -1,
    );
    const dateDelimiter = mergedOptions.strictMode
      ? formatDelimiter
      : mergedOptions.delimiters.find((delimiter) => input.indexOf(delimiter) !== -1);
    const dateAndFormat = zip(
      input.split(dateDelimiter!),
      mergedOptions.format.toLowerCase().split(formatDelimiter!),
    );
    const dateObj: { [key: string]: string } = {};

    for (const [dateWord, formatWord] of dateAndFormat) {
      if (!dateWord || !formatWord || dateWord.length !== formatWord.length) {
        return false;
      }

      dateObj[formatWord.charAt(0)] = dateWord;
    }

    let fullYear = dateObj.y;

    // Check if the year starts with a hyphen
    if (fullYear.startsWith('-')) {
      return false; // Hyphen before year is not allowed
    }

    if (dateObj.y.length === 2) {
      const parsedYear = parseInt(dateObj.y, 10);

      if (isNaN(parsedYear)) {
        return false;
      }

      const currentYearLastTwoDigits = new Date().getFullYear() % 100;

      if (parsedYear < currentYearLastTwoDigits) {
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

    return new Date(`${fullYear}-${month}-${day}T00:00:00.000Z`).getUTCDate() === +dateObj.d;
  }

  if (!mergedOptions.strictMode) {
    return Object.prototype.toString.call(input) === '[object Date]' && isFinite(input as number);
  }

  return false;
}
