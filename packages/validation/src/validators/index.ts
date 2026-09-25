import { equals } from './equals';
import { contains } from './contains';
import { matches } from './matches';

import { isEmail } from './isEmail';
import { isURL } from './isURL';
import { isMACAddress } from './isMACAddress';
import { isIP } from './isIP';
import { isIPRange } from './isIPRange';
import { isFQDN } from './isFQDN';
import { isDate } from './isDate';
import { isTime } from './isTime';

import { isBoolean } from './isBoolean';
import { isLocale } from './isLocale';

import { isAbaRouting } from './isAbaRouting';
import { isAlpha, locales as isAlphaLocales } from './isAlpha';
import { isAlphanumeric, locales as isAlphanumericLocales } from './isAlphanumeric';
import { isNumeric } from './isNumeric';
import { isPassportNumber, locales as passportNumberLocales } from './isPassportNumber';
import { isPort } from './isPort';
import { isLowercase } from './isLowercase';
import { isUppercase } from './isUppercase';

import { isIMEI } from './isIMEI';

import { isAscii } from './isAscii';
import { isFullWidth } from './isFullWidth';
import { isHalfWidth } from './isHalfWidth';
import { isVariableWidth } from './isVariableWidth';
import { isMultibyte } from './isMultibyte';
import { isSemVer } from './isSemVer';
import { isSurrogatePair } from './isSurrogatePair';

import { isInt } from './isInt';
import { isFloat, locales as isFloatLocales } from './isFloat';
import { isDecimal } from './isDecimal';
import { isHexadecimal } from './isHexadecimal';
import { isOctal } from './isOctal';
import { isDivisibleBy } from './isDivisibleBy';

import { isHexColor } from './isHexColor';
import { isRgbColor } from './isRgbColor';
import { isHSL } from './isHSL';

import { isISRC } from './isISRC';

import { isIBAN, locales as ibanLocales } from './isIBAN';
import { isBIC } from './isBIC';

import { isMD5 } from './isMD5';
import { isHash } from './isHash';
import { isJWT } from './isJWT';

import { isJSON } from './isJSON';
import { isEmpty } from './isEmpty';

import { isLength } from './isLength';
import { isByteLength } from './isByteLength';

import { isULID } from './isULID';
import { isUUID } from './isUUID';
import { isMongoId } from './isMongoId';

import { isAfter } from './isAfter';
import { isBefore } from './isBefore';

import { isIn } from './isIn';

import { isLuhnNumber } from './isLuhnNumber';
import { isCreditCard } from './isCreditCard';
import { isIdentityCard } from './isIdentityCard';

import { isEAN } from './isEAN';
import { isISIN } from './isISIN';
import { isISBN } from './isISBN';
import { isISSN } from './isISSN';

import { isMobilePhone, locales as isMobilePhoneLocales } from './isMobilePhone';

import { isEthereumAddress } from './isEthereumAddress';

import { isCurrency } from './isCurrency';

import { isBtcAddress } from './isBtcAddress';

import { isISO6346, isFreightContainerID } from './isISO6346';
import { isISO6391 } from './isISO6391';
import { isISO8601 } from './isISO8601';
import { isRFC3339 } from './isRFC3339';
import { isISO15924 } from './isISO15924';
import { isISO31661Alpha2 } from './isISO31661Alpha2';
import { isISO31661Alpha3 } from './isISO31661Alpha3';
import { isISO31661Numeric } from './isISO31661Numeric';
import { isISO4217 } from './isISO4217';

import { isBase32 } from './isBase32';
import { isBase58 } from './isBase58';
import { isBase64 } from './isBase64';
import { isDataURI } from './isDataURI';
import { isMagnetURI } from './isMagnetURI';
import { isMailtoURI } from './isMailtoURI';

import { isMimeType } from './isMimeType';

import { isLatLong } from './isLatLong';
import { isPostalCode, locales as isPostalCodeLocales } from './isPostalCode';

import { isWhitelisted } from './isWhitelisted';

import { isSlug } from './isSlug';
import { isLicensePlate } from './isLicensePlate';
import { isStrongPassword } from './isStrongPassword';

import { isVAT } from './isVAT';

// Frozen: no consumer can monkey-patch a validator globally (use createValidator() to extend).
export const validator = Object.freeze({
  equals,
  contains,
  matches,
  isEmail,
  isURL,
  isMACAddress,
  isIP,
  isIPRange,
  isFQDN,
  isBoolean,
  isIBAN,
  isBIC,
  isAbaRouting,
  isAlpha,
  isAlphaLocales,
  isAlphanumeric,
  isAlphanumericLocales,
  isNumeric,
  isPassportNumber,
  passportNumberLocales,
  isPort,
  isLowercase,
  isUppercase,
  isAscii,
  isFullWidth,
  isHalfWidth,
  isVariableWidth,
  isMultibyte,
  isSemVer,
  isSurrogatePair,
  isInt,
  isIMEI,
  isFloat,
  isFloatLocales,
  isDecimal,
  isHexadecimal,
  isOctal,
  isDivisibleBy,
  isHexColor,
  isRgbColor,
  isHSL,
  isISRC,
  isMD5,
  isHash,
  isJWT,
  isJSON,
  isEmpty,
  isLength,
  isLocale,
  isByteLength,
  isULID,
  isUUID,
  isMongoId,
  isAfter,
  isBefore,
  isIn,
  isLuhnNumber,
  isCreditCard,
  isIdentityCard,
  isEAN,
  isISIN,
  isISBN,
  isISSN,
  isMobilePhone,
  isMobilePhoneLocales,
  isPostalCode,
  isPostalCodeLocales,
  isEthereumAddress,
  isCurrency,
  isBtcAddress,
  isISO6346,
  isFreightContainerID,
  isISO6391,
  isISO8601,
  isISO15924,
  isRFC3339,
  isISO31661Alpha2,
  isISO31661Alpha3,
  isISO31661Numeric,
  isISO4217,
  isBase32,
  isBase58,
  isBase64,
  isDataURI,
  isMagnetURI,
  isMailtoURI,
  isMimeType,
  isLatLong,
  isWhitelisted,
  isSlug,
  isStrongPassword,
  isDate,
  isTime,
  isLicensePlate,
  isVAT,
  ibanLocales,
});

/**
 * Type of the `validator` object — derived from the implementations, so every validator exposes
 * its exact signature and options (and TypeScript autocompletes them).
 */
export type ValidatorRegistry = typeof validator;

// Option / parameter types of each validator (declared next to the validator that uses them).
export type { ContainsOptions } from './contains';
export type { IsAfterOptions } from './isAfter';
export type { IsAlphaOptions } from './isAlpha';
export type { IsAlphanumericOptions } from './isAlphanumeric';
export type { IsBase32Options } from './isBase32';
export type { IsBase64Options } from './isBase64';
export type { IsBeforeOptions } from './isBefore';
export type { IsBooleanOptions } from './isBoolean';
export type { IsByteLengthOptions } from './isByteLength';
export type { CreditCardProvider, IsCreditCardOptions } from './isCreditCard';
export type { IsCurrencyOptions } from './isCurrency';
export type { IsDateOptions } from './isDate';
export type { IsDecimalOptions } from './isDecimal';
export type { IsEmailOptions } from './isEmail';
export type { IsEmptyOptions } from './isEmpty';
export type { IsFQDNOptions } from './isFQDN';
export type { IsFloatOptions } from './isFloat';
export type { HashAlgorithm } from './isHash';
export type { IsHexColorOptions } from './isHexColor';
export type { IsIBANOptions } from './isIBAN';
export type { IsIMEIOptions } from './isIMEI';
export type { IsIPVersion, IsIPOptions } from './isIP';
export type { IsISBNVersion, IsISBNOptions } from './isISBN';
export type { IsISO31661Options } from './isISO31661Alpha2';
export type { IsISO8601Options } from './isISO8601';
export type { IsISSNOptions } from './isISSN';
export type { IdentityCardLocale } from './isIdentityCard';
export type { IsIntOptions } from './isInt';
export type { IsJSONOptions } from './isJSON';
export type { IsLatLongOptions } from './isLatLong';
export type { IsLengthOptions } from './isLength';
export type { LicensePlateLocale } from './isLicensePlate';
export type { IsMACAddressOptions } from './isMACAddress';
export type { IsMobilePhoneOptions, MobilePhoneLocale } from './isMobilePhone';
export type { IsNumericOptions } from './isNumeric';
export type { PassportCountryCode } from './isPassportNumber';
export type { PostalCodeLocale } from './isPostalCode';
export type { IsRgbColorOptions } from './isRgbColor';
export type { IsStrongPasswordOptions } from './isStrongPassword';
export type { IsTimeOptions } from './isTime';
export type { IsURLOptions } from './isURL';
export type { IsUUIDVersion } from './isUUID';
export type { VATCountryCode } from './isVAT';
