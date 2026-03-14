import {
  check_str,
  check_str_n,
  check_str_nn,
  check_str_s,
  check_num,
  check_num_n,
  check_num_nn,
  check_bool,
} from '#wasm';

// ─── Direct typed validators (1 WASM boundary crossing per call) ──────────────
//
// Each function calls the WASM dispatcher directly — no Validator instance,
// no accumulation loop, no run() call. Use these for single-field checks where
// low overhead matters most.

// ── String ───────────────────────────────────────────────────────────────────

export const isNotEmpty = (v: string): boolean => check_str('isNotEmpty', v);
export const isMinLength = (v: string, min: number): boolean => check_str_n('isMinLength', v, min);
export const isMaxLength = (v: string, max: number): boolean => check_str_n('isMaxLength', v, max);
export const isExactLength = (v: string, len: number): boolean =>
  check_str_n('isExactLength', v, len);
export const isLengthBetween = (v: string, min: number, max: number): boolean =>
  check_str_nn('isLengthBetween', v, min, max);
export const isAlpha = (v: string): boolean => check_str('isAlpha', v);
export const isAlphanumeric = (v: string): boolean => check_str('isAlphanumeric', v);
export const isNumeric = (v: string): boolean => check_str('isNumeric', v);
export const isAscii = (v: string): boolean => check_str('isAscii', v);
export const isLowercase = (v: string): boolean => check_str('isLowercase', v);
export const isUppercase = (v: string): boolean => check_str('isUppercase', v);
export const isContains = (v: string, sub: string): boolean => check_str_s('isContains', v, sub);
export const isStartsWith = (v: string, prefix: string): boolean =>
  check_str_s('isStartsWith', v, prefix);
export const isEndsWith = (v: string, suffix: string): boolean =>
  check_str_s('isEndsWith', v, suffix);
export const isMatchesRegex = (v: string, pattern: string): boolean =>
  check_str_s('isMatchesRegex', v, pattern);

// ── Number ───────────────────────────────────────────────────────────────────

export const isInteger = (v: number): boolean => check_num('isInteger', v);
export const isPositiveInteger = (v: number): boolean => check_num('isPositiveInteger', v);
export const isNegativeInteger = (v: number): boolean => check_num('isNegativeInteger', v);
export const isFloat = (v: number): boolean => check_num('isFloat', v);
export const isPositiveNumber = (v: number): boolean => check_num('isPositiveNumber', v);
export const isNegativeNumber = (v: number): boolean => check_num('isNegativeNumber', v);
export const isInRange = (v: number, min: number, max: number): boolean =>
  check_num_nn('isInRange', v, min, max);
export const isMinValue = (v: number, min: number): boolean => check_num_n('isMinValue', v, min);
export const isMaxValue = (v: number, max: number): boolean => check_num_n('isMaxValue', v, max);
export const isMultipleOf = (v: number, factor: number): boolean =>
  check_num_n('isMultipleOf', v, factor);

// ── Email ────────────────────────────────────────────────────────────────────

export const isEmail = (v: string): boolean => check_str('isEmail', v);

// ── UUID ─────────────────────────────────────────────────────────────────────

export const isUuid = (v: string): boolean => check_str('isUuid', v);
export const isUuidV4 = (v: string): boolean => check_str('isUuidV4', v);
export const isUuidV7 = (v: string): boolean => check_str('isUuidV7', v);

// ── URL ──────────────────────────────────────────────────────────────────────

export const isUrl = (v: string): boolean => check_str('isUrl', v);
export const isUrlWithScheme = (v: string, scheme: string): boolean =>
  check_str_s('isUrlWithScheme', v, scheme);

// ── IP ───────────────────────────────────────────────────────────────────────

export const isIp = (v: string): boolean => check_str('isIp', v);
export const isIpv4 = (v: string): boolean => check_str('isIpv4', v);
export const isIpv6 = (v: string): boolean => check_str('isIpv6', v);

// ── Date / Time ──────────────────────────────────────────────────────────────

export const isDate = (v: string): boolean => check_str('isDate', v);
export const isDatetime = (v: string): boolean => check_str('isDatetime', v);
export const isTime = (v: string): boolean => check_str('isTime', v);

// ── Boolean ──────────────────────────────────────────────────────────────────

export const isBooleanString = (v: string | boolean): boolean =>
  typeof v === 'boolean' ? check_bool('isBooleanString', v) : check_str('isBooleanString', v);

// ── Misc ─────────────────────────────────────────────────────────────────────

export const isCreditCard = (v: string): boolean => check_str('isCreditCard', v);
export const isJson = (v: string): boolean => check_str('isJson', v);
export const isHexColor = (v: string): boolean => check_str('isHexColor', v);
export const isBase64 = (v: string): boolean => check_str('isBase64', v);
export const isSlug = (v: string): boolean => check_str('isSlug', v);
