import { toString } from '../convert/string';
import { optionsOf } from '../helpers/config';

export interface IsISSNOptions {
  /** Only accept the upper-case check digit `X`. */
  case_sensitive?: boolean;
  /** The hyphen (`1234-5678`) is mandatory. */
  require_hyphen?: boolean;
}

const issn = '^\\d{4}-?\\d{3}[\\dX]$';

export function isISSN(input: unknown, options?: IsISSNOptions): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  const opts = optionsOf(options);
  let testIssn: string | RegExp = issn;
  testIssn = opts.require_hyphen ? (testIssn as string).replace('?', '') : testIssn;
  testIssn = opts.case_sensitive ? new RegExp(testIssn) : new RegExp(testIssn, 'i');
  if (!(testIssn as RegExp).test(str)) {
    return false;
  }
  const digits = str.replace('-', '').toUpperCase();
  let checksum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i];
    checksum += (digit === 'X' ? 10 : +digit) * (8 - i);
  }
  return checksum % 11 === 0;
}
