import { toString } from './string';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

function isNonEmptyPlainRecord(v: unknown): v is Record<string, unknown> {
  return (
    v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0
  );
}

/**
 * A non-empty JSON object (plain record). Arrays, primitives and `{}` are rejected on purpose:
 * this models a domain-safe JSON object, not arbitrary JSON (use `validator.isJSON` for that).
 * Object inputs are returned by reference (not copied).
 */
export function toJson(v: unknown): Converted<Record<string, unknown>> {
  if (typeof v === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(v);
    } catch {
      return failure(ConvertMessages.JSON);
    }
    return isNonEmptyPlainRecord(parsed) ? success(parsed) : failure(ConvertMessages.JSON);
  }
  if (!isNonEmptyPlainRecord(v)) return failure(ConvertMessages.JSON);
  try {
    JSON.stringify(v);
  } catch {
    return failure(ConvertMessages.JSON); // circular structures, BigInt values…
  }
  return success(v);
}

export interface JsonValueConvertOptions {
  /** Also accept the JSON primitives `null`, `true` and `false`. Default: false. */
  allowPrimitives?: boolean;
  /** Accept any value `JSON.parse` produces (numbers and strings included). Default: false. */
  allowAnyValue?: boolean;
}

/**
 * Parses JSON TEXT into its value — rule PORTED FROM `validator.isJSON`, moved here so the
 * validator no longer duplicates JSON parsing. It is NOT compatible with `toJson`: any object is
 * accepted (arrays and `{}` included), primitives are opt-in, booleans/finite numbers are read
 * through `toString`, and object inputs are NOT accepted (only text).
 */
export function toJsonValue(v: unknown, options?: JsonValueConvertOptions): Converted<unknown> {
  const str = toString(v);
  if (!str.ok) return failure(ConvertMessages.JSON_VALUE);
  let parsed: unknown;
  try {
    parsed = JSON.parse(str.value);
  } catch {
    return failure(ConvertMessages.JSON_VALUE);
  }
  if (options?.allowAnyValue) return success(parsed);
  if (options?.allowPrimitives && (parsed === null || parsed === true || parsed === false)) {
    return success(parsed);
  }
  return parsed !== null && typeof parsed === 'object'
    ? success(parsed)
    : failure(ConvertMessages.JSON_VALUE);
}
