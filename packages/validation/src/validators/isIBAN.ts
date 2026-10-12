import { hasOwn } from '../helpers/hasOwn';
import { toString } from '../convert/string';
import { configText, optionsOf } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';

export interface IsIBANOptions {
  whitelist?: string[];
  blacklist?: string[];
}

const ibanRegexThroughCountryCode = {
  AD: /^(AD[0-9]{2})\d{8}[A-Z0-9]{12}$/,
  AE: /^(AE[0-9]{2})\d{3}\d{16}$/,
  AL: /^(AL[0-9]{2})\d{8}[A-Z0-9]{16}$/,
  AT: /^(AT[0-9]{2})\d{16}$/,
  AZ: /^(AZ[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  BA: /^(BA[0-9]{2})\d{16}$/,
  BE: /^(BE[0-9]{2})\d{12}$/,
  BG: /^(BG[0-9]{2})[A-Z]{4}\d{6}[A-Z0-9]{8}$/,
  BH: /^(BH[0-9]{2})[A-Z]{4}[A-Z0-9]{14}$/,
  BR: /^(BR[0-9]{2})\d{23}[A-Z]{1}[A-Z0-9]{1}$/,
  BY: /^(BY[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  CH: /^(CH[0-9]{2})\d{5}[A-Z0-9]{12}$/,
  CR: /^(CR[0-9]{2})\d{18}$/,
  CY: /^(CY[0-9]{2})\d{8}[A-Z0-9]{16}$/,
  CZ: /^(CZ[0-9]{2})\d{20}$/,
  DE: /^(DE[0-9]{2})\d{18}$/,
  DK: /^(DK[0-9]{2})\d{14}$/,
  DO: /^(DO[0-9]{2})[A-Z]{4}\d{20}$/,
  DZ: /^(DZ\d{24})$/,
  EE: /^(EE[0-9]{2})\d{16}$/,
  EG: /^(EG[0-9]{2})\d{25}$/,
  ES: /^(ES[0-9]{2})\d{20}$/,
  FI: /^(FI[0-9]{2})\d{14}$/,
  FO: /^(FO[0-9]{2})\d{14}$/,
  FR: /^(FR[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
  GB: /^(GB[0-9]{2})[A-Z]{4}\d{14}$/,
  GE: /^(GE[0-9]{2})[A-Z0-9]{2}\d{16}$/,
  GI: /^(GI[0-9]{2})[A-Z]{4}[A-Z0-9]{15}$/,
  GL: /^(GL[0-9]{2})\d{14}$/,
  GR: /^(GR[0-9]{2})\d{7}[A-Z0-9]{16}$/,
  GT: /^(GT[0-9]{2})[A-Z0-9]{4}[A-Z0-9]{20}$/,
  HR: /^(HR[0-9]{2})\d{17}$/,
  HU: /^(HU[0-9]{2})\d{24}$/,
  IE: /^(IE[0-9]{2})[A-Z]{4}\d{14}$/,
  IL: /^(IL[0-9]{2})\d{19}$/,
  IQ: /^(IQ[0-9]{2})[A-Z]{4}\d{15}$/,
  IR: /^(IR[0-9]{2})\d{22}$/,
  IS: /^(IS[0-9]{2})\d{22}$/,
  IT: /^(IT[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
  JO: /^(JO[0-9]{2})[A-Z]{4}\d{22}$/,
  KW: /^(KW[0-9]{2})[A-Z]{4}[A-Z0-9]{22}$/,
  KZ: /^(KZ[0-9]{2})\d{3}[A-Z0-9]{13}$/,
  LB: /^(LB[0-9]{2})\d{4}[A-Z0-9]{20}$/,
  LC: /^(LC[0-9]{2})[A-Z]{4}[A-Z0-9]{24}$/,
  LI: /^(LI[0-9]{2})\d{5}[A-Z0-9]{12}$/,
  LT: /^(LT[0-9]{2})\d{16}$/,
  LU: /^(LU[0-9]{2})\d{3}[A-Z0-9]{13}$/,
  LV: /^(LV[0-9]{2})[A-Z]{4}[A-Z0-9]{13}$/,
  MA: /^(MA[0-9]{26})$/,
  MC: /^(MC[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
  MD: /^(MD[0-9]{2})[A-Z0-9]{20}$/,
  ME: /^(ME[0-9]{2})\d{18}$/,
  MK: /^(MK[0-9]{2})\d{3}[A-Z0-9]{10}\d{2}$/,
  MR: /^(MR[0-9]{2})\d{23}$/,
  MT: /^(MT[0-9]{2})[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
  MU: /^(MU[0-9]{2})[A-Z]{4}\d{19}[A-Z]{3}$/,
  MZ: /^(MZ[0-9]{2})\d{21}$/,
  NL: /^(NL[0-9]{2})[A-Z]{4}\d{10}$/,
  NO: /^(NO[0-9]{2})\d{11}$/,
  PK: /^(PK[0-9]{2})[A-Z0-9]{4}\d{16}$/,
  PL: /^(PL[0-9]{2})\d{24}$/,
  PS: /^(PS[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
  PT: /^(PT[0-9]{2})\d{21}$/,
  QA: /^(QA[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
  RO: /^(RO[0-9]{2})[A-Z]{4}[A-Z0-9]{16}$/,
  RS: /^(RS[0-9]{2})\d{18}$/,
  SA: /^(SA[0-9]{2})\d{2}[A-Z0-9]{18}$/,
  SC: /^(SC[0-9]{2})[A-Z]{4}\d{20}[A-Z]{3}$/,
  SE: /^(SE[0-9]{2})\d{20}$/,
  SI: /^(SI[0-9]{2})\d{15}$/,
  SK: /^(SK[0-9]{2})\d{20}$/,
  SM: /^(SM[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
  SV: /^(SV[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  TL: /^(TL[0-9]{2})\d{19}$/,
  TN: /^(TN[0-9]{2})\d{20}$/,
  TR: /^(TR[0-9]{2})\d{5}[A-Z0-9]{17}$/,
  UA: /^(UA[0-9]{2})\d{6}[A-Z0-9]{19}$/,
  VA: /^(VA[0-9]{2})\d{18}$/,
  VG: /^(VG[0-9]{2})[A-Z]{4}\d{16}$/,
  XK: /^(XK[0-9]{2})\d{16}$/,
};

function hasOnlyValidCountryCodes(countryCodeArray: string[]): boolean {
  const countryCodeArrayFilteredWithObjectIbanCode = countryCodeArray.filter(
    (countryCode) => !hasOwn(ibanRegexThroughCountryCode, countryCode),
  );

  return countryCodeArrayFilteredWithObjectIbanCode.length === 0;
}

// A string would be matched by substring ('XDEX' includes 'DE'), so only arrays are accepted.
function countryCodeList(list: unknown, name: string): string[] | undefined {
  if (list === undefined || list === null) return undefined;
  if (!Array.isArray(list) || !list.every((code) => typeof code === 'string')) {
    throw new ValidationConfigError(
      `${name} must be an array of country codes, got ${configText(list)}`,
    );
  }
  return list.map((code) => code.toUpperCase());
}

function hasValidIbanFormat(str: string, options: IsIBANOptions): boolean {
  const strippedStr = str.replace(/[\s-]+/gi, '').toUpperCase();
  const isoCountryCode = strippedStr.slice(0, 2).toUpperCase();

  const isoCountryCodeInIbanRegexCodeObject = hasOwn(ibanRegexThroughCountryCode, isoCountryCode);

  const whitelist = countryCodeList(options.whitelist, 'whitelist');
  const blacklist = countryCodeList(options.blacklist, 'blacklist');

  if (whitelist) {
    if (!hasOnlyValidCountryCodes(whitelist)) {
      return false;
    }

    const isoCountryCodeInWhiteList = whitelist.includes(isoCountryCode);

    if (!isoCountryCodeInWhiteList) {
      return false;
    }
  }

  if (blacklist) {
    const isoCountryCodeInBlackList = blacklist.includes(isoCountryCode);

    if (isoCountryCodeInBlackList) {
      return false;
    }
  }

  return (
    isoCountryCodeInIbanRegexCodeObject &&
    ibanRegexThroughCountryCode[isoCountryCode].test(strippedStr)
  );
}

// ISO 13616 mod-97 check: https://en.wikipedia.org/wiki/International_Bank_Account_Number
function hasValidIbanChecksum(str: string): boolean {
  const strippedStr = str.replace(/[^A-Z0-9]+/gi, '').toUpperCase();
  const rearranged = strippedStr.slice(4) + strippedStr.slice(0, 4);
  const alphaCapsReplacedWithDigits = rearranged.replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55),
  );

  // Piecewise mod-97 keeps the running value below Number.MAX_SAFE_INTEGER.
  let remainder = 0;
  for (const chunk of alphaCapsReplacedWithDigits.match(/\d{1,7}/g) as RegExpMatchArray) {
    remainder = Number(`${remainder}${chunk}`) % 97;
  }

  return remainder === 1;
}

export function isIBAN(value: unknown, options?: IsIBANOptions): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;

  return hasValidIbanFormat(str, optionsOf(options)) && hasValidIbanChecksum(str);
}

export const locales: readonly string[] = Object.freeze(Object.keys(ibanRegexThroughCountryCode));
