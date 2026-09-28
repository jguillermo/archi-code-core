import type { ValidatorRegistry } from '../validators';

/** Names of the registry entries that are validators (the locale tables are left out). */
export type ValidatorName = {
  [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: any[]) => boolean
    ? K
    : never;
}[keyof ValidatorRegistry];

/** The parameters of a validator after the value. */
type Params<K extends ValidatorName> = ValidatorRegistry[K] extends (
  value: any,
  ...rest: infer R
) => boolean
  ? R
  : never;

/**
 * The `properties` of a built-in validation: the validator's options object (its second argument),
 * or nothing (never) for the validators that only take the value.
 */
export type ValidationProperties<K extends ValidatorName> =
  Params<K> extends [] ? never : NonNullable<Params<K>[0]>;
