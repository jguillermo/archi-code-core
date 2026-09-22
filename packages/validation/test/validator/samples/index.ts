import type { ValidatorSample } from './types';
import { isEmailSample } from './isEmail.samples';
import { isURLSample } from './isURL.samples';
import { isFQDNSample } from './isFQDN.samples';
import { isMACAddressSample } from './isMACAddress.samples';
import { isIPSample } from './isIP.samples';
import { isIBANSample } from './isIBAN.samples';
import { isBICSample } from './isBIC.samples';
import { isAlphaSample } from './isAlpha.samples';
import { isAlphanumericSample } from './isAlphanumeric.samples';
import { isAsciiSample } from './isAscii.samples';
import { isFullWidthSample } from './isFullWidth.samples';
import { isHalfWidthSample } from './isHalfWidth.samples';
import { isVariableWidthSample } from './isVariableWidth.samples';
import { isMultibyteSample } from './isMultibyte.samples';
import { isSurrogatePairSample } from './isSurrogatePair.samples';
import { isSemVerSample } from './isSemVer.samples';
import { isHexColorSample } from './isHexColor.samples';
import { isRgbColorSample } from './isRgbColor.samples';
import { isHSLSample } from './isHSL.samples';
import { isHexadecimalSample } from './isHexadecimal.samples';
import { isOctalSample } from './isOctal.samples';
import { isDecimalSample } from './isDecimal.samples';
import { isHashSample } from './isHash.samples';
import { isJWTSample } from './isJWT.samples';
import { isJSONSample } from './isJSON.samples';
import { isEmptySample } from './isEmpty.samples';
import { isUUIDSample } from './isUUID.samples';
import { isMongoIdSample } from './isMongoId.samples';
import { isCreditCardSample } from './isCreditCard.samples';
import { isEANSample } from './isEAN.samples';
import { isISINSample } from './isISIN.samples';
import { isISBNSample } from './isISBN.samples';
import { isISSNSample } from './isISSN.samples';
import { isMobilePhoneSample } from './isMobilePhone.samples';
import { isPostalCodeSample } from './isPostalCode.samples';
import { isEthereumAddressSample } from './isEthereumAddress.samples';
import { isCurrencySample } from './isCurrency.samples';
import { isBtcAddressSample } from './isBtcAddress.samples';
import { isISO31661Alpha2Sample } from './isISO31661Alpha2.samples';
import { isISO31661Alpha3Sample } from './isISO31661Alpha3.samples';
import { isISO31661NumericSample } from './isISO31661Numeric.samples';
import { isISO4217Sample } from './isISO4217.samples';
import { isISO8601Sample } from './isISO8601.samples';
import { isRFC3339Sample } from './isRFC3339.samples';
import { isISRCSample } from './isISRC.samples';
import { isISO6391Sample } from './isISO6391.samples';
import { isBase32Sample } from './isBase32.samples';
import { isBase58Sample } from './isBase58.samples';
import { isBase64Sample } from './isBase64.samples';
import { isDataURISample } from './isDataURI.samples';
import { isMagnetURISample } from './isMagnetURI.samples';
import { isMimeTypeSample } from './isMimeType.samples';
import { isLatLongSample } from './isLatLong.samples';
import { isStrongPasswordSample } from './isStrongPassword.samples';
import { isLocaleSample } from './isLocale.samples';
import { isLowercaseSample } from './isLowercase.samples';
import { isUppercaseSample } from './isUppercase.samples';
import { isNumericSample } from './isNumeric.samples';
import { isPortSample } from './isPort.samples';
import { isIntSample } from './isInt.samples';
import { isBooleanSample } from './isBoolean.samples';
import { isFloatSample } from './isFloat.samples';
import { isDateSample } from './isDate.samples';
import { isIPRangeSample } from './isIPRange.samples';
import { isAbaRoutingSample } from './isAbaRouting.samples';
import { isIMEISample } from './isIMEI.samples';
import { isISO6346Sample } from './isISO6346.samples';
import { isFreightContainerIDSample } from './isFreightContainerID.samples';
import { isISO15924Sample } from './isISO15924.samples';
import { isAfterSample } from './isAfter.samples';
import { isBeforeSample } from './isBefore.samples';
import { isInSample } from './isIn.samples';
import { isLuhnNumberSample } from './isLuhnNumber.samples';
import { isByteLengthSample } from './isByteLength.samples';
import { isLengthSample } from './isLength.samples';
import { isULIDSample } from './isULID.samples';
import { isWhitelistedSample } from './isWhitelisted.samples';
import { isSlugSample } from './isSlug.samples';
import { isTimeSample } from './isTime.samples';
import { isLicensePlateSample } from './isLicensePlate.samples';
import { isVATSample } from './isVAT.samples';
import { isMailtoURISample } from './isMailtoURI.samples';
import { isMD5Sample } from './isMD5.samples';
import { isIdentityCardSample } from './isIdentityCard.samples';
import { isTaxIDSample } from './isTaxID.samples';
import { isPassportNumberSample } from './isPassportNumber.samples';

/** Todos los samples de validadores (fuente única para specs y benchmark). */
export const samples: ValidatorSample[] = [
  isEmailSample,
  isURLSample,
  isFQDNSample,
  isMACAddressSample,
  isIPSample,
  isIBANSample,
  isBICSample,
  isAlphaSample,
  isAlphanumericSample,
  isAsciiSample,
  isFullWidthSample,
  isHalfWidthSample,
  isVariableWidthSample,
  isMultibyteSample,
  isSurrogatePairSample,
  isSemVerSample,
  isHexColorSample,
  isRgbColorSample,
  isHSLSample,
  isHexadecimalSample,
  isOctalSample,
  isDecimalSample,
  isHashSample,
  isJWTSample,
  isJSONSample,
  isEmptySample,
  isUUIDSample,
  isMongoIdSample,
  isCreditCardSample,
  isEANSample,
  isISINSample,
  isISBNSample,
  isISSNSample,
  isMobilePhoneSample,
  isPostalCodeSample,
  isEthereumAddressSample,
  isCurrencySample,
  isBtcAddressSample,
  isISO31661Alpha2Sample,
  isISO31661Alpha3Sample,
  isISO31661NumericSample,
  isISO4217Sample,
  isISO8601Sample,
  isRFC3339Sample,
  isISRCSample,
  isISO6391Sample,
  isBase32Sample,
  isBase58Sample,
  isBase64Sample,
  isDataURISample,
  isMagnetURISample,
  isMimeTypeSample,
  isLatLongSample,
  isStrongPasswordSample,
  isLocaleSample,
  isLowercaseSample,
  isUppercaseSample,
  isNumericSample,
  isPortSample,
  isIntSample,
  isBooleanSample,
  isFloatSample,
  isDateSample,
  isIPRangeSample,
  isAbaRoutingSample,
  isIMEISample,
  isISO6346Sample,
  isFreightContainerIDSample,
  isISO15924Sample,
  isAfterSample,
  isBeforeSample,
  isInSample,
  isLuhnNumberSample,
  isByteLengthSample,
  isLengthSample,
  isULIDSample,
  isWhitelistedSample,
  isSlugSample,
  isTimeSample,
  isLicensePlateSample,
  isVATSample,
  isMailtoURISample,
  isMD5Sample,
  isIdentityCardSample,
  isTaxIDSample,
  isPassportNumberSample,
];
