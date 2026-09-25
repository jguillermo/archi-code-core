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
