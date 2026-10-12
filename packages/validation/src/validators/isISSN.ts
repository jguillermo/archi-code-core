import { toString } from '../convert/string';
import { optionsOf } from '../helpers/config';

export interface IsISSNOptions {
  case_sensitive?: boolean;
  require_hyphen?: boolean;
}

const issn = '^\\d{4}-?\\d{3}[\\dX]$';

export function isISSN(value: unknown, options?: IsISSNOptions): boolean {
  const stringResult = toString(value);
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
