import { toJson } from '../convert/json';

/**
 * Returns true if `v` can be used as a non-empty JSON object (plain record).
 * Arrays and empty objects return false intentionally — this validates that
 * a value is a domain-safe JSON object, not arbitrary JSON.
 *
 * For generic JSON syntax validation (including arrays and primitives),
 * use `validator.isJSON()` instead.
 */
export function canBeJson(v: unknown): boolean {
  return toJson(v).ok;
}

/**
 * Alias for `canBeJson` — makes it explicit that this validates objects, not all JSON.
 * @see canBeJson
 */
export const canBeJsonObject = canBeJson;
