import { toBoolean } from '../convert/boolean';

/**
 * Boolean check. The rule lives in `convert/boolean` (`mode: 'strict'` / `'loose'`, ported from
 * this validator): strict is case-sensitive `'true'|'false'|'1'|'0'`; loose also lower-cases and
 * accepts `'yes'|'no'`. Native booleans and the numbers 1/0 are always valid.
 */
export default function isBoolean(
  str: unknown,
  options: { loose?: boolean } | null = null,
): boolean {
  return toBoolean(str, { mode: options?.loose ? 'loose' : 'strict' }).ok;
}
