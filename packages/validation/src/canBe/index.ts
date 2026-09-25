/**
 * canBe — "can this value be parsed to type T?"
 *
 * Each `canBeX(v)` calls the matching converter and returns only its first value:
 * `canBeX(v) === toX(v).ok`. The type rules live exclusively in `convert/`.
 */
export { canBeString } from './string';
export { canBeBoolean } from './boolean';
export { canBeInteger } from './integer';
export { canBeFloat } from './float';
export { canBeDate } from './date';
export { canBeJson, canBeJsonObject } from './json';
export { canBeArray } from './array';
export { canBeEnum } from './enum';
