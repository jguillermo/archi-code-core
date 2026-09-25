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
 * Layering (hard rule): `convert/` depends on NOTHING outside itself — never on `validators/` nor
 * on `canBe/`. Validators and canBe consume convert, never the reverse.
 *
 * Some converters take options that carry rules PORTED FROM THE VALIDATORS (`isBoolean`, `isInt`,
 * `isFloat`, `isJSON`, `isDate`, `isAfter`/`isBefore`). Those rules were moved here so there is a
 * single implementation of each type check; they are documented on each option because they are
 * NOT compatible with the default convert rules.
 */
export type { Converted, ConvertMessage, Success, Failure } from './result';
export { ConvertMessages } from './result';
export { toString } from './string';
export { toBoolean } from './boolean';
export type { BooleanConvertOptions } from './boolean';
export { toInteger } from './integer';
export type { IntegerConvertOptions } from './integer';
export { toFloat } from './float';
export type { FloatConvertOptions } from './float';
export { toDate } from './date';
export type { DateConvertOptions } from './date';
export { toJson, toJsonValue } from './json';
export type { JsonValueConvertOptions } from './json';
export { toArray } from './array';
export { toEnum } from './enum';
