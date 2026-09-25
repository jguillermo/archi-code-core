import assertString from '../validators/util/assertString';

/* eslint-disable no-control-regex */
const lowChars = /[\x00-\x1F\x7F]+/g;
const lowCharsKeepNewLines = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/g;
/* eslint-enable no-control-regex */

export function stripLow(str: string, keepNewLines?: boolean): string {
  assertString(str);
  return str.replace(keepNewLines ? lowCharsKeepNewLines : lowChars, '');
}
