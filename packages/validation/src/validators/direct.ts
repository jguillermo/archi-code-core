import {
  check_code_str,
  check_code_str_n,
  check_code_str_nn,
  check_code_str_s,
  check_code_num,
  check_code_num_n,
  check_code_num_nn,
  check_code_bool,
} from '#wasm';

// ─── Direct typed validators — integer code API (fastest possible) ────────────
//
// Each function makes exactly 1 WASM call with an integer rule code.
// No string is marshaled for the rule name — only the value crosses the boundary.

// ── String ───────────────────────────────────────────────────────────────────

export const isNotEmpty = (v: string): boolean => check_code_str(0, v);
export const isMinLength = (v: string, min: number): boolean => check_code_str_n(1, v, min);
export const isMaxLength = (v: string, max: number): boolean => check_code_str_n(2, v, max);
export const isExactLength = (v: string, len: number): boolean => check_code_str_n(3, v, len);
export const isLengthBetween = (v: string, min: number, max: number): boolean =>
  check_code_str_nn(4, v, min, max);
export const isAlpha = (v: string): boolean => check_code_str(5, v);
export const isAlphanumeric = (v: string): boolean => check_code_str(6, v);
export const isNumeric = (v: string): boolean => check_code_str(7, v);
export const isAscii = (v: string): boolean => check_code_str(8, v);
export const isLowercase = (v: string): boolean => check_code_str(9, v);
export const isUppercase = (v: string): boolean => check_code_str(10, v);
export const isContains = (v: string, sub: string): boolean => check_code_str_s(11, v, sub);
export const isStartsWith = (v: string, prefix: string): boolean => check_code_str_s(12, v, prefix);
export const isEndsWith = (v: string, suffix: string): boolean => check_code_str_s(13, v, suffix);
export const isMatchesRegex = (v: string, pattern: string): boolean =>
  check_code_str_s(14, v, pattern);

// ── Number ───────────────────────────────────────────────────────────────────

export const isInteger = (v: number): boolean => check_code_num(15, v);
export const isPositiveInteger = (v: number): boolean => check_code_num(16, v);
export const isNegativeInteger = (v: number): boolean => check_code_num(17, v);
export const isFloat = (v: number): boolean => check_code_num(18, v);
export const isPositiveNumber = (v: number): boolean => check_code_num(19, v);
export const isNegativeNumber = (v: number): boolean => check_code_num(20, v);
export const isInRange = (v: number, min: number, max: number): boolean =>
  check_code_num_nn(21, v, min, max);
export const isMinValue = (v: number, min: number): boolean => check_code_num_n(22, v, min);
export const isMaxValue = (v: number, max: number): boolean => check_code_num_n(23, v, max);
export const isMultipleOf = (v: number, factor: number): boolean => check_code_num_n(24, v, factor);

// ── Email ────────────────────────────────────────────────────────────────────

export const isEmail = (v: string): boolean => check_code_str(25, v);

// ── UUID ─────────────────────────────────────────────────────────────────────

export const isUuid = (v: string): boolean => check_code_str(26, v);
export const isUuidV4 = (v: string): boolean => check_code_str(27, v);
export const isUuidV7 = (v: string): boolean => check_code_str(28, v);

// ── URL ──────────────────────────────────────────────────────────────────────

export const isUrl = (v: string): boolean => check_code_str(29, v);
export const isUrlWithScheme = (v: string, scheme: string): boolean =>
  check_code_str_s(30, v, scheme);

// ── IP ───────────────────────────────────────────────────────────────────────

export const isIp = (v: string): boolean => check_code_str(31, v);
export const isIpv4 = (v: string): boolean => check_code_str(32, v);
export const isIpv6 = (v: string): boolean => check_code_str(33, v);

// ── Date / Time ──────────────────────────────────────────────────────────────

export const isDate = (v: string): boolean => check_code_str(34, v);
export const isDatetime = (v: string): boolean => check_code_str(35, v);
export const isTime = (v: string): boolean => check_code_str(36, v);

// ── Boolean ──────────────────────────────────────────────────────────────────

export const isBooleanString = (v: string | boolean): boolean =>
  typeof v === 'boolean' ? check_code_bool(37, v) : check_code_str(37, v);

// ── Misc ─────────────────────────────────────────────────────────────────────

export const isCreditCard = (v: string): boolean => check_code_str(38, v);
export const isJson = (v: string): boolean => check_code_str(39, v);
export const isHexColor = (v: string): boolean => check_code_str(40, v);
export const isBase64 = (v: string): boolean => check_code_str(41, v);
export const isSlug = (v: string): boolean => check_code_str(42, v);
