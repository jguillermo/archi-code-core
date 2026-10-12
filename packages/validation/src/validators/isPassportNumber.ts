import { toString } from '../convert/string';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { optionsOf } from '../helpers/config';

const passportRegexByCountryCode = {
  AM: /^[A-Z]{2}\d{7}$/,
  AR: /^[A-Z]{3}\d{6}$/,
  AT: /^[A-Z]\d{7}$/,
  AU: /^[A-Z]\d{7}$/,
  AZ: /^[A-Z]{1}\d{8}$/,
  BE: /^[A-Z]{2}\d{6}$/,
  BG: /^\d{9}$/,
  BR: /^[A-Z]{2}\d{6}$/,
  BY: /^[A-Z]{2}\d{7}$/,
  CA: /^[A-Z]{2}\d{6}$|^[A-Z]\d{6}[A-Z]{2}$/,
  CH: /^[A-Z]\d{7}$/,
  CN: /^G\d{8}$|^E(?![IO])[A-Z0-9]\d{7}$/,
  CY: /^[A-Z](\d{6}|\d{8})$/,
  CZ: /^\d{8}$/,
  DE: /^[CFGHJKLMNPRTVWXYZ0-9]{9}$/,
  DK: /^\d{9}$/,
  DZ: /^\d{9}$/,
  EE: /^([A-Z]\d{7}|[A-Z]{2}\d{7})$/,
  ES: /^[A-Z0-9]{2}([A-Z0-9]?)\d{6}$/,
  FI: /^[A-Z]{2}\d{7}$/,
  FR: /^\d{2}[A-Z]{2}\d{5}$/,
  GB: /^\d{9}$/,
  GR: /^[A-Z]{2}\d{7}$/,
  HR: /^\d{9}$/,
  HU: /^[A-Z]{2}(\d{6}|\d{7})$/,
  IE: /^[A-Z0-9]{2}\d{7}$/,
  IN: /^[A-Z]{1}-?\d{7}$/,
  ID: /^[A-C]\d{7}$/,
  IR: /^[A-Z]\d{8}$/,
  IS: /^(A)\d{7}$/,
  IT: /^[A-Z0-9]{2}\d{7}$/,
  JM: /^[Aa]\d{7}$/,
  JP: /^[A-Z]{2}\d{7}$/,
  KR: /^[MS]\d{8}$/,
  KZ: /^[a-zA-Z]\d{7}$/,
  LI: /^[a-zA-Z]\d{5}$/,
  LT: /^[A-Z0-9]{8}$/,
  LU: /^[A-Z0-9]{8}$/,
  LV: /^[A-Z0-9]{2}\d{7}$/,
  LY: /^[A-Z0-9]{8}$/,
  MT: /^\d{7}$/,
  MZ: /^(?:[A-Z]{2}\d{7}|\d{2}[A-Z]{2}\d{5})$/,
  MY: /^[AHK]\d{8}$/,
  MX: /^[A-Z]\d{8}$/,
  NL: /^[A-Z]{2}[A-Z0-9]{6}\d$/,
  NZ: /^([Ll]([Aa]|[Dd]|[Ff]|[Hh])|[Ee]([Aa]|[Pp])|[Nn])\d{6}$/,
  PH: /^(?:[A-Z](?:\d{6}|\d{7}[A-Z])|[A-Z]{2}(?:\d{6}|\d{7}))$/,
  PK: /^[A-Z]{2}\d{7}$/,
  PL: /^[A-Z]{2}\d{7}$/,
  PT: /^[A-Z]\d{6}$/,
  RO: /^\d{8,9}$/,
  RU: /^\d{9}$/,
  SE: /^\d{8}$/,
  SL: /^(P)[A-Z]\d{7}$/,
  SK: /^[0-9A-Z]\d{7}$/,
  TH: /^[A-Z]{1,2}\d{6,7}$/,
  TR: /^[A-Z]\d{8}$/,
  UA: /^[A-Z]{2}\d{6}$/,
  US: /^\d{9}$|^[A-Z]\d{8}$/,
  ZA: /^[TAMD]\d{8}$/,
};

export type PassportCountryCode = keyof typeof passportRegexByCountryCode | (string & {});

export const locales: readonly string[] = Object.freeze(Object.keys(passportRegexByCountryCode));

export interface IsPassportNumberOptions {
  countryCode: PassportCountryCode;
}

export function isPassportNumber(value: unknown, options: IsPassportNumberOptions): boolean {
  const { countryCode } = optionsOf(options);
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  const normalizedStr = str.replace(/\s/g, '').toUpperCase();

  if (typeof countryCode !== 'string')
    throw new ValidationConfigError('countryCode must be a string');
  // Unknown country codes return false instead of throwing ValidationConfigError (historic).
  const code = countryCode.toUpperCase();
  return (
    hasOwn(passportRegexByCountryCode, code) && passportRegexByCountryCode[code].test(normalizedStr)
  );
}
