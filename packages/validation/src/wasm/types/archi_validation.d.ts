// Hand-written type declarations for the archi_validation WASM module.
// Run `npm run build:wasm` to compile Rust to WebAssembly.

// ─── Binary batch validation ──────────────────────────────────────────────────

/** Run all validations from a pre-encoded binary payload. Returns 1 if all pass, 0 if any fail. */
export function run_flat(data: Uint8Array): number;

/** Run all validations and return per-field failing rule codes. Format: [ok_byte, f0_count, f0_code0, ..., f1_count, ...] */
export function run_flat_codes(data: Uint8Array): Uint8Array;

/** Run validations from a cached schema buffer + a per-call values buffer. Same output format as run_flat_codes. */
export function run_split(schema: Uint8Array, values: Uint8Array): Uint8Array;

// ─── Cast functions — naming: cast_{target}_{source} ─────────────────────────
export function cast_bool(value: string): boolean;
export function cast_bool_num(value: number): boolean;
export function cast_integer(value: string): number;
export function cast_integer_num(value: number): number;
export function cast_num_bool(value: boolean): number;
export function cast_float(value: string): number;
export function cast_float_num(value: number): number;
export function cast_str_num(value: number): string;
export function cast_str_bool(value: boolean): string;
export function cast_date(value: string): number;
export function cast_date_num(value: number): number;
export function cast_json(value: string): void;

// ─── Primitive type checkers — accept any JS value ───────────────────────────
export function can_be_string(value: unknown): boolean;
export function can_be_boolean(value: unknown): boolean;
export function can_be_integer(value: unknown): boolean;
export function can_be_float(value: unknown): boolean;
export function can_be_date(value: unknown): boolean;
export function can_be_json(value: unknown): boolean;
export function can_be_array(value: unknown): boolean;
export function can_be_enum(value: unknown, options_json: string): boolean;

// ─── Conversion functions — convert or throw ─────────────────────────────────
export function to_integer(value: unknown): number;
export function to_float(value: unknown): number;
export function to_boolean(value: unknown): boolean;
export function to_string(value: unknown): string;
export function to_date(value: unknown): number;
export function to_json(value: unknown): unknown;
export function to_array(value: unknown): unknown;
export function to_enum(value: unknown, options_json: string): unknown;

// ─── Individual validators (validator.js-compatible API) ─────────────────────

// Email
export function isEmail(str: string): boolean;

// URL / URI
export function isURL(str: string): boolean;
export function isDataURI(str: string): boolean;
export function isMagnetURI(str: string): boolean;
export function isMailtoURI(str: string): boolean;

// Network
/** version: 0 = any, 4 = IPv4, 6 = IPv6 */
export function isIP(str: string, version?: 0 | 4 | 6): boolean;
/** version: 0 = any, 4 = IPv4 CIDR, 6 = IPv6 CIDR */
export function isIPRange(str: string, version?: 0 | 4 | 6): boolean;
export function isMACAddress(str: string): boolean;
export function isFQDN(str: string): boolean;
export function isPort(str: string): boolean;

// Date / Time
export function isDate(str: string): boolean;
export function isTime(str: string): boolean;
export function isISO8601(str: string): boolean;
export function isRFC3339(str: string): boolean;
export function isAfter(str: string, date: string): boolean;
export function isBefore(str: string, date: string): boolean;

// Boolean
/** loose: true also accepts "yes"/"no" */
export function isBoolean(str: string, loose?: boolean): boolean;

// String
export function isEmpty(str: string): boolean;
export function isAlpha(str: string): boolean;
export function isAlphanumeric(str: string): boolean;
export function isNumeric(str: string): boolean;
export function isAscii(str: string): boolean;
export function isLowercase(str: string): boolean;
export function isUppercase(str: string): boolean;
/** max: 0 = unlimited */
export function isLength(str: string, min: number, max?: number): boolean;
/** max: 0 = unlimited */
export function isByteLength(str: string, min: number, max?: number): boolean;
/** values_json: JSON-encoded string array, e.g. '["foo","bar"]' */
export function isIn(str: string, values_json: string): boolean;
export function isWhitelisted(str: string, chars: string): boolean;
export function equals(a: string, b: string): boolean;
export function contains(str: string, seed: string): boolean;
export function matches(str: string, pattern: string): boolean;

// Numbers
export function isInt(str: string): boolean;
export function isFloat(str: string): boolean;
export function isDecimal(str: string): boolean;
export function isHexadecimal(str: string): boolean;
export function isOctal(str: string): boolean;
export function isDivisibleBy(str: string, num: number): boolean;

// Colors
export function isHexColor(str: string): boolean;
export function isRgbColor(str: string): boolean;
export function isHSL(str: string): boolean;

// Encoding
export function isBase32(str: string): boolean;
export function isBase58(str: string): boolean;
export function isBase64(str: string): boolean;

// Format / Media
export function isMimeType(str: string): boolean;
export function isLatLong(str: string): boolean;
export function isLocale(str: string): boolean;
export function isSlug(str: string): boolean;
export function isSemVer(str: string): boolean;
export function isJSON(str: string): boolean;
export function isISO6346(str: string): boolean;
export function isFreightContainerID(str: string): boolean;

// UUID / ID
/** version: 0 = any UUID, 4 = v4, 7 = v7 */
export function isUUID(str: string, version?: 0 | 4 | 7): boolean;
export function isULID(str: string): boolean;
export function isMongoId(str: string): boolean;

// Finance
export function isCreditCard(str: string): boolean;
export function isLuhnNumber(str: string): boolean;
export function isIBAN(str: string): boolean;
export function isBIC(str: string): boolean;
export function isEAN(str: string): boolean;
/** version: 0 = any, 10 = ISBN-10, 13 = ISBN-13 */
export function isISBN(str: string, version?: 0 | 10 | 13): boolean;
export function isISIN(str: string): boolean;
export function isISSN(str: string): boolean;
export function isEthereumAddress(str: string): boolean;
export function isBtcAddress(str: string): boolean;
export function isCurrency(str: string): boolean;

// Hash
export function isMD5(str: string): boolean;
export function isHash(str: string, algorithm: HashAlgorithm): boolean;
export function isJWT(str: string): boolean;

// Identity / Document
export function isIMEI(str: string): boolean;
export function isAbaRouting(str: string): boolean;
export function isISRC(str: string): boolean;
export function isPassportNumber(str: string, locale: string): boolean;
export function isIdentityCard(str: string, locale: string): boolean;
export function isTaxID(str: string, locale: string): boolean;
export function isMobilePhone(str: string, locale: string): boolean;
export function isPostalCode(str: string, locale: string): boolean;
export function isLicensePlate(str: string, locale: string): boolean;
export function isVAT(str: string, locale: string): boolean;
export function isStrongPassword(str: string): boolean;

// ISO codes
export function isISO6391(str: string): boolean;
export function isISO31661Alpha2(str: string): boolean;
export function isISO31661Alpha3(str: string): boolean;
export function isISO31661Numeric(str: string): boolean;
export function isISO4217(str: string): boolean;
export function isISO15924(str: string): boolean;

// Unicode
export function isFullWidth(str: string): boolean;
export function isHalfWidth(str: string): boolean;
export function isVariableWidth(str: string): boolean;
export function isMultibyte(str: string): boolean;
export function isSurrogatePair(str: string): boolean;

// ─── Sanitizers ──────────────────────────────────────────────────────────────
export function ltrim(str: string, chars?: string): string;
export function rtrim(str: string, chars?: string): string;
export function trim(str: string, chars?: string): string;
export function escape(str: string): string;
export function unescape(str: string): string;
export function stripLow(str: string, keepNewLines?: boolean): string;
export function whitelist(str: string, chars: string): string;
export function blacklist(str: string, chars: string): string;
export function normalizeEmail(str: string): string | null;

// ─── Converters ──────────────────────────────────────────────────────────────
/** Returns Unix timestamp in ms, or NaN if invalid */
export function toDate(str: string): number;
/** Returns parsed float, or NaN if invalid */
export function toFloat(str: string): number;
/** Returns parsed int with given radix (default 10), or NaN */
export function toInt(str: string, radix?: number): number;
/** strict: true = only "1"/"true" → true; false = loose mode */
export function toBoolean(str: string, strict?: boolean): boolean;

// ─── Types ────────────────────────────────────────────────────────────────────
export type HashAlgorithm =
  | 'md5' | 'md4' | 'sha1' | 'sha256' | 'sha384' | 'sha512'
  | 'ripemd128' | 'ripemd160' | 'tiger128' | 'tiger160' | 'tiger192'
  | 'crc32' | 'crc32b';
