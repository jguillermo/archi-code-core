import { toJsonValue } from '../convert/json';

export interface IsJSONOptions {
  allow_primitives?: boolean;
  allow_any_value?: boolean;
}

/**
 * Returns true if `str` is syntactically valid JSON text. Objects and arrays are accepted;
 * primitives only with `allow_primitives` (null/true/false) or `allow_any_value` (anything).
 * The parsing rule lives in `convert/json` (`toJsonValue`, ported from this validator).
 *
 * For domain object validation (plain records only, no arrays),
 * use `canBeJson()` from the canBe module instead.
 */
export default function isJSON(str: unknown, options?: IsJSONOptions): boolean {
  return toJsonValue(str, {
    allowPrimitives: options?.allow_primitives,
    allowAnyValue: options?.allow_any_value,
  }).ok;
}
