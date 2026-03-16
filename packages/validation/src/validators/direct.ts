import { run_flat } from '#wasm';
import {
  encodeSingleStr,
  encodeSingleStrN,
  encodeSingleStrNN,
  encodeSingleStrS,
  encodeSingleNum,
  encodeSingleNumN,
  encodeSingleNumNN,
  encodeSingleBool,
} from './flat-encoder';

// ─── Direct typed validators — binary API ────────────────────────────────────
//
// Each function encodes a minimal 1-field binary buffer and calls run_flat()
// — 1 WASM boundary crossing, architecturally consistent with the batch API.

// ── String ───────────────────────────────────────────────────────────────────

export const isNotEmpty = (v: string): boolean => run_flat(encodeSingleStr(0, v)) === 1;
export const isMinLength = (v: string, min: number): boolean =>
  run_flat(encodeSingleStrN(1, v, min)) === 1;
export const isMaxLength = (v: string, max: number): boolean =>
  run_flat(encodeSingleStrN(2, v, max)) === 1;
export const isExactLength = (v: string, len: number): boolean =>
  run_flat(encodeSingleStrN(3, v, len)) === 1;
export const isLengthBetween = (v: string, min: number, max: number): boolean =>
  run_flat(encodeSingleStrNN(4, v, min, max)) === 1;
export const isAlpha = (v: string): boolean => run_flat(encodeSingleStr(5, v)) === 1;
export const isAlphanumeric = (v: string): boolean => run_flat(encodeSingleStr(6, v)) === 1;
export const isNumeric = (v: string): boolean => run_flat(encodeSingleStr(7, v)) === 1;
export const isAscii = (v: string): boolean => run_flat(encodeSingleStr(8, v)) === 1;
export const isLowercase = (v: string): boolean => run_flat(encodeSingleStr(9, v)) === 1;
export const isUppercase = (v: string): boolean => run_flat(encodeSingleStr(10, v)) === 1;
export const isContains = (v: string, sub: string): boolean =>
  run_flat(encodeSingleStrS(11, v, sub)) === 1;
export const isStartsWith = (v: string, prefix: string): boolean =>
  run_flat(encodeSingleStrS(12, v, prefix)) === 1;
export const isEndsWith = (v: string, suffix: string): boolean =>
  run_flat(encodeSingleStrS(13, v, suffix)) === 1;
export const isMatchesRegex = (v: string, pattern: string): boolean =>
  run_flat(encodeSingleStrS(14, v, pattern)) === 1;

// ── Number ───────────────────────────────────────────────────────────────────

export const isInteger = (v: number): boolean => run_flat(encodeSingleNum(15, v)) === 1;
export const isPositiveInteger = (v: number): boolean => run_flat(encodeSingleNum(16, v)) === 1;
export const isNegativeInteger = (v: number): boolean => run_flat(encodeSingleNum(17, v)) === 1;
export const isFloat = (v: number): boolean => run_flat(encodeSingleNum(18, v)) === 1;
export const isPositiveNumber = (v: number): boolean => run_flat(encodeSingleNum(19, v)) === 1;
export const isNegativeNumber = (v: number): boolean => run_flat(encodeSingleNum(20, v)) === 1;
export const isInRange = (v: number, min: number, max: number): boolean =>
  run_flat(encodeSingleNumNN(21, v, min, max)) === 1;
export const isMinValue = (v: number, min: number): boolean =>
  run_flat(encodeSingleNumN(22, v, min)) === 1;
export const isMaxValue = (v: number, max: number): boolean =>
  run_flat(encodeSingleNumN(23, v, max)) === 1;
export const isMultipleOf = (v: number, factor: number): boolean =>
  run_flat(encodeSingleNumN(24, v, factor)) === 1;

// ── Format validators ────────────────────────────────────────────────────────

export const isEmail = (v: string): boolean => run_flat(encodeSingleStr(25, v)) === 1;
export const isUuid = (v: string): boolean => run_flat(encodeSingleStr(26, v)) === 1;
export const isUuidV4 = (v: string): boolean => run_flat(encodeSingleStr(27, v)) === 1;
export const isUuidV7 = (v: string): boolean => run_flat(encodeSingleStr(28, v)) === 1;
export const isUrl = (v: string): boolean => run_flat(encodeSingleStr(29, v)) === 1;
export const isUrlWithScheme = (v: string, scheme: string): boolean =>
  run_flat(encodeSingleStrS(30, v, scheme)) === 1;
export const isIp = (v: string): boolean => run_flat(encodeSingleStr(31, v)) === 1;
export const isIpv4 = (v: string): boolean => run_flat(encodeSingleStr(32, v)) === 1;
export const isIpv6 = (v: string): boolean => run_flat(encodeSingleStr(33, v)) === 1;
export const isDate = (v: string): boolean => run_flat(encodeSingleStr(34, v)) === 1;
export const isDatetime = (v: string): boolean => run_flat(encodeSingleStr(35, v)) === 1;
export const isTime = (v: string): boolean => run_flat(encodeSingleStr(36, v)) === 1;
export const isBooleanString = (v: string | boolean): boolean =>
  typeof v === 'boolean'
    ? run_flat(encodeSingleBool(37, v)) === 1
    : run_flat(encodeSingleStr(37, v)) === 1;
export const isCreditCard = (v: string): boolean => run_flat(encodeSingleStr(38, v)) === 1;
export const isJson = (v: string): boolean => run_flat(encodeSingleStr(39, v)) === 1;
export const isHexColor = (v: string): boolean => run_flat(encodeSingleStr(40, v)) === 1;
export const isBase64 = (v: string): boolean => run_flat(encodeSingleStr(41, v)) === 1;
export const isSlug = (v: string): boolean => run_flat(encodeSingleStr(42, v)) === 1;
