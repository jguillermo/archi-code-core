import { toBoolean } from '../convert/boolean';

export interface IsBooleanOptions {
  /** Also accept `'yes'`/`'no'` and ignore case. Default: false. */
  loose?: boolean;
}

/**
 * Boolean check. The rule lives in `convert/boolean` (`mode: 'strict'` / `'loose'`, ported from
 * this validator): strict is case-sensitive `'true'|'false'|'1'|'0'`; loose also lower-cases and
 * accepts `'yes'|'no'`. Native booleans and the numbers 1/0 are always valid.
 */
export function isBoolean(str: unknown, options: IsBooleanOptions | null = null): boolean {
  return toBoolean(str, { mode: options?.loose ? 'loose' : 'strict' }).ok;
}
