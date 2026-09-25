/**
 * convertTo — the ONLY place where the type rules live.
 *
 * Every `toX(v)` returns a result object:
 *   - `{ ok: true, value, error: null }` → `v` is of type X (or convertible to it) and `value` is the converted value;
 *   - `{ ok: false, value: null, error }` → `v` cannot be converted; `error` is a FIXED message from
 *     `ConvertMessages` saying what happened (never includes the value itself).
 *
 * Converters never throw.
 *
 * `canBeX(v)` (canBe/) simply returns `toX(v).ok`, so both tools agree by construction.
 *
 * Layering: this module may import `core/coerce` and individual validator files (never the
 * `validators/index` barrel). Files here must not import `canBe/` (which is built on top of it).
 */
export type { Converted, ConvertMessage, Success, Failure } from './result';
export { ConvertMessages } from './result';
export { toString } from './string';
export { toBoolean } from './boolean';
export { toInteger } from './integer';
export { toFloat } from './float';
export { toDate } from './date';
export { toJson } from './json';
export { toArray } from './array';
export { toEnum } from './enum';
