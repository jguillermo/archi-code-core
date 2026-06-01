import tryToString from './util/tryToString';

const issn = '^\\d{4}-?\\d{3}[\\dX]$';

export default function isISSN(
  str: unknown,
  options: { require_hyphen?: boolean; case_sensitive?: boolean } = {},
): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  let testIssn: string | RegExp = issn;
  testIssn = options.require_hyphen ? (testIssn as string).replace('?', '') : testIssn;
  testIssn = options.case_sensitive ? new RegExp(testIssn) : new RegExp(testIssn, 'i');
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
