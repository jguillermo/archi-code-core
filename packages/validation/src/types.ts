// ─── Option interfaces ─────────────────────────────────────────────────────────

export interface IsEmailOptions {
  allow_display_name?: boolean;
  allow_underscores?: boolean;
  require_display_name?: boolean;
  allow_utf8_local_part?: boolean;
  require_tld?: boolean;
  blacklisted_chars?: string;
  ignore_max_length?: boolean;
  host_blacklist?: string[];
  host_whitelist?: string[];
  allow_ip_domain?: boolean;
  domain_specific_validation?: boolean;
}

export interface IsURLOptions {
  protocols?: string[];
  require_tld?: boolean;
  require_protocol?: boolean;
  require_host?: boolean;
  require_port?: boolean;
  require_valid_protocol?: boolean;
  allow_underscores?: boolean;
  allow_trailing_dot?: boolean;
  allow_protocol_relative_urls?: boolean;
  allow_fragments?: boolean;
  allow_query_components?: boolean;
  disallow_auth?: boolean;
  validate_length?: boolean;
  max_allowed_length?: number;
  host_whitelist?: Array<string | RegExp>;
  host_blacklist?: Array<string | RegExp>;
}

export interface IsFQDNOptions {
  require_tld?: boolean;
  allow_underscores?: boolean;
  allow_trailing_dot?: boolean;
  allow_numeric_tld?: boolean;
  allow_wildcard?: boolean;
  ignore_max_length?: boolean;
}

export interface IsMACAddressOptions {
  no_separators?: boolean;
  eui?: '48' | '64';
}

export interface IsIntOptions {
  min?: number;
  max?: number;
  lt?: number;
  gt?: number;
  allow_leading_zeroes?: boolean;
}

export interface IsFloatOptions {
  min?: number;
  max?: number;
  lt?: number;
  gt?: number;
  locale?: string;
}

export interface IsDecimalOptions {
  force_decimal?: boolean;
  decimal_digits?: string;
  locale?: string;
}

export interface IsByteLengthOptions {
  min?: number;
  max?: number;
}

export interface IsLengthOptions {
  min?: number;
  max?: number;
  discreteLengths?: number[];
}

export interface IsAlphaOptions {
  ignore?: string | RegExp;
}

export interface IsAlphanumericOptions {
  ignore?: string | RegExp;
}

export interface IsNumericOptions {
  no_symbols?: boolean;
  locale?: string;
}

export interface IsDateOptions {
  format?: string;
  strictMode?: boolean;
  delimiters?: string[];
}

export interface IsTimeOptions {
  hourFormat?: 'hour12' | 'hour24';
  mode?: 'default' | 'withSeconds' | 'withOptionalSeconds';
}

export interface IsJSONOptions {
  allow_primitives?: boolean;
  allow_any_value?: boolean;
}

export interface IsBase32Options {
  crockford?: boolean;
}

export interface IsBase64Options {
  urlSafe?: boolean;
  padding?: boolean;
}

export interface IsHexColorOptions {
  allow_hash?: boolean;
}

export interface IsRgbColorOptions {
  includePercentValues?: boolean;
}

export interface IsIMEIOptions {
  allow_hyphens?: boolean;
}

export interface IsLatLongOptions {
  checkDMS?: boolean;
}

export interface IsMobilePhoneOptions {
  strictMode?: boolean;
}

export interface IsEmptyOptions {
  ignore_whitespace?: boolean;
}

export interface IsCurrencyOptions {
  symbol?: string;
  require_symbol?: boolean;
  allow_space_after_symbol?: boolean;
  symbol_after_digits?: boolean;
  allow_negatives?: boolean;
  parens_for_negatives?: boolean;
  negative_sign_before_digits?: boolean;
  negative_sign_after_digits?: boolean;
  allow_negative_sign_placeholder?: boolean;
  thousands_separator?: string;
  decimal_separator?: string;
  allow_decimal?: boolean;
  require_decimal?: boolean;
  digits_after_decimal?: number[];
  allow_space_after_digits?: boolean;
}

export interface NormalizeEmailOptions {
  all_lowercase?: boolean;
  gmail_lowercase?: boolean;
  gmail_remove_dots?: boolean;
  gmail_remove_subaddress?: boolean;
  gmail_convert_googlemaildotcom?: boolean;
  outlookdotcom_lowercase?: boolean;
  outlookdotcom_remove_subaddress?: boolean;
  yahoo_lowercase?: boolean;
  yahoo_remove_subaddress?: boolean;
  yandex_lowercase?: boolean;
  icloud_lowercase?: boolean;
  icloud_remove_subaddress?: boolean;
}

export interface IsStrongPasswordOptions {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
  returnScore?: boolean;
  pointsPerUnique?: number;
  pointsPerRepeat?: number;
  pointsForContainingLower?: number;
  pointsForContainingUpper?: number;
  pointsForContainingNumber?: number;
  pointsForContainingSymbol?: number;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Public contract of the `validator` object. */
export interface ValidatorRegistry {
  version: string;

  // — Core validators —
  isEmail(str: unknown, options?: IsEmailOptions): boolean;
  isURL(str: unknown, options?: IsURLOptions): boolean;
  isFQDN(str: unknown, options?: IsFQDNOptions): boolean;
  isMACAddress(str: unknown, options?: IsMACAddressOptions): boolean;
  isIP(str: unknown, version?: number | string | { version?: number | string }): boolean;
  isIPRange(str: unknown, version?: number | string): boolean;

  isBoolean(str: unknown, options?: { loose?: boolean }): boolean;
  isDate(str: unknown, options?: IsDateOptions | string): boolean;
  isTime(str: unknown, options?: IsTimeOptions): boolean;
  isInt(str: unknown, options?: IsIntOptions): boolean;
  isFloat(str: unknown, options?: IsFloatOptions): boolean;
  isDecimal(str: unknown, options?: IsDecimalOptions): boolean;
  isNumeric(str: unknown, options?: IsNumericOptions): boolean;
  isDivisibleBy(str: unknown, num: number): boolean;

  isAlpha(str: unknown, locale?: string, options?: IsAlphaOptions): boolean;
  isAlphanumeric(str: unknown, locale?: string, options?: IsAlphanumericOptions): boolean;
  isAlphaLocales: string[];
  isAlphanumericLocales: string[];

  isAscii(str: unknown): boolean;
  isFullWidth(str: unknown): boolean;
  isHalfWidth(str: unknown): boolean;
  isVariableWidth(str: unknown): boolean;
  isMultibyte(str: unknown): boolean;
  isSurrogatePair(str: unknown): boolean;

  isJSON(str: unknown, options?: IsJSONOptions): boolean;
  isEmpty(str: unknown, options?: IsEmptyOptions): boolean;
  isLength(str: unknown, options?: IsLengthOptions): boolean;
  isByteLength(str: unknown, options?: IsByteLengthOptions): boolean;

  isUUID(str: unknown, version?: 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): boolean;
  isMongoId(str: unknown): boolean;
  isULID(str: unknown): boolean;

  isHash(str: unknown, algorithm: string): boolean;
  isJWT(str: unknown): boolean;
  isMD5(str: unknown): boolean;

  isHexColor(str: unknown, options?: IsHexColorOptions): boolean;
  isRgbColor(str: unknown, options?: IsRgbColorOptions): boolean;
  isHSL(str: unknown): boolean;
  isHexadecimal(str: unknown): boolean;
  isOctal(str: unknown): boolean;
  isBase32(str: unknown, options?: IsBase32Options): boolean;
  isBase58(str: unknown): boolean;
  isBase64(str: unknown, options?: IsBase64Options): boolean;

  isCreditCard(str: unknown): boolean;
  isLuhnNumber(str: unknown): boolean;
  isIBAN(str: unknown): boolean;
  isBIC(str: unknown): boolean;
  isISIN(str: unknown): boolean;
  isEAN(str: unknown): boolean;
  isISBN(str: unknown, version?: '10' | '13' | 10 | 13): boolean;
  isISSN(str: unknown, options?: { case_sensitive?: boolean; require_hyphen?: boolean }): boolean;
  isAbaRouting(str: unknown): boolean;
  isBtcAddress(str: unknown): boolean;
  isEthereumAddress(str: unknown): boolean;
  isCurrency(str: unknown, options?: IsCurrencyOptions): boolean;

  isMobilePhone(str: unknown, locale?: string | string[], options?: IsMobilePhoneOptions): boolean;
  isMobilePhoneLocales: string[];
  isPostalCode(str: unknown, locale: string): boolean;
  isPostalCodeLocales: string[];

  isISO6346(str: unknown): boolean;
  isFreightContainerID(str: unknown): boolean;
  isISO6391(str: unknown): boolean;
  isISO8601(str: unknown, options?: { strict?: boolean; strictSeparator?: boolean }): boolean;
  isISO15924(str: unknown): boolean;
  isISO31661Alpha2(str: unknown): boolean;
  isISO31661Alpha3(str: unknown): boolean;
  isISO31661Numeric(str: unknown): boolean;
  isISO4217(str: unknown): boolean;
  isRFC3339(str: unknown): boolean;
  isISRC(str: unknown): boolean;

  isDataURI(str: unknown): boolean;
  isMagnetURI(str: unknown): boolean;
  isMailtoURI(str: unknown, options?: unknown): boolean;
  isMimeType(str: unknown): boolean;

  isLatLong(str: unknown, options?: IsLatLongOptions): boolean;
  isPort(str: unknown): boolean;
  isLocale(str: unknown): boolean;
  isIMEI(str: unknown, options?: IsIMEIOptions): boolean;
  isLicensePlate(str: unknown, locale: string): boolean;
  isTaxID(str: unknown, locale: string): boolean;
  isPassportNumber(str: unknown, countryCode: string): boolean;
  passportNumberLocales: string[];
  isIdentityCard(str: unknown, locale?: string): boolean;
  isVAT(str: unknown, countryCode: string): boolean;
  isSlug(str: unknown): boolean;
  isSemVer(str: unknown): boolean;
  isLowercase(str: unknown): boolean;
  isUppercase(str: unknown): boolean;
  isIn(str: unknown, values: unknown[]): boolean;
  isAfter(str: unknown, date?: string): boolean;
  isBefore(str: unknown, date?: string): boolean;
  isWhitelisted(str: unknown, chars: string | string[]): boolean;
  isStrongPassword(str: unknown, options?: IsStrongPasswordOptions): boolean | number;

  equals(str: unknown, comparison: string): boolean;
  contains(str: unknown, elem: string, options?: { ignoreCase?: boolean; minOccurrences?: number }): boolean;
  matches(str: unknown, pattern: RegExp | string, modifiers?: string): boolean;

  // — Sanitizers (kept for backward compat) —
  toDate(str: string): Date | null;
  toFloat(str: string): number;
  toInt(str: string, radix?: number): number;
  toBoolean(str: string, strict?: boolean): boolean;
  trim(str: string, chars?: string): string;
  ltrim(str: string, chars?: string): string;
  rtrim(str: string, chars?: string): string;
  escape(str: string): string;
  unescape(str: string): string;
  stripLow(str: string, keep_new_lines?: boolean): string;
  whitelist(str: string, chars: string): string;
  blacklist(str: string, chars: string): string;
  normalizeEmail(email: string, options?: NormalizeEmailOptions): string | false;
  toString(v: unknown): string;

  // — Locale data —
  isFloatLocales: string[];
  ibanLocales: string[];
}
