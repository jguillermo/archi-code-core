import type { ValidatorRegistry } from '../validators';
import { hasOwn } from '../helpers/hasOwn';

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

type Options<K extends ValidatorName, I extends number> = NonNullable<Params<K>[I]>;

/**
 * Validators whose parameters are not a single options object: turns `properties` into their
 * arguments. Each key is named after the parameter it fills; the remaining keys, if any, are the
 * validator's options object. A missing optional key leaves the validator's own default.
 */
export const toArguments = {
  isMobilePhone: ({
    locale,
    ...options
  }: { locale?: Params<'isMobilePhone'>[0] } & Options<'isMobilePhone', 1>) => [locale, options],
  isAlpha: ({ locale, ...options }: { locale?: Params<'isAlpha'>[0] } & Options<'isAlpha', 1>) => [
    locale,
    options,
  ],
  isAlphanumeric: ({
    locale,
    ...options
  }: { locale?: Params<'isAlphanumeric'>[0] } & Options<'isAlphanumeric', 1>) => [locale, options],
  contains: ({ elem, ...options }: { elem: Params<'contains'>[0] } & Options<'contains', 1>) => [
    elem,
    options,
  ],
  matches: ({
    pattern,
    modifiers,
  }: {
    pattern: Params<'matches'>[0];
    modifiers?: Params<'matches'>[1];
  }) => [pattern, modifiers],
  isHash: ({ algorithm }: { algorithm: Params<'isHash'>[0] }) => [algorithm],
  isIn: ({ values }: { values: Params<'isIn'>[0] }) => [values],
  equals: ({ comparison }: { comparison: Params<'equals'>[0] }) => [comparison],
  isDivisibleBy: ({ num }: { num: Params<'isDivisibleBy'>[0] }) => [num],
  isWhitelisted: ({ chars }: { chars: Params<'isWhitelisted'>[0] }) => [chars],
  isPostalCode: ({ locale }: { locale: Params<'isPostalCode'>[0] }) => [locale],
  isLicensePlate: ({ locale }: { locale: Params<'isLicensePlate'>[0] }) => [locale],
  isIdentityCard: ({ locale }: { locale?: Params<'isIdentityCard'>[0] }) => [locale],
  isPassportNumber: ({ countryCode }: { countryCode: Params<'isPassportNumber'>[0] }) => [
    countryCode,
  ],
  isVAT: ({ countryCode }: { countryCode: Params<'isVAT'>[0] }) => [countryCode],
  isUUID: ({ version }: { version?: Params<'isUUID'>[0] }) => [version],
  isIPRange: ({ version }: { version?: Params<'isIPRange'>[0] }) => [version],
} satisfies { [K in ValidatorName]?: (properties: never) => Params<K> };

type Translated = keyof typeof toArguments;

// The object form of an options parameter: the shorthand forms (a min length, a version, a date…)
// are left out.
type ObjectForm<T> = Exclude<T, string | number | null | undefined>;

/**
 * The `properties` of a built-in validation: the keys of `toArguments` for the validators listed
 * there, the options object for those taking one, and nothing (never) for those without parameters.
 */
export type ValidationProperties<K extends ValidatorName> = K extends Translated
  ? Parameters<(typeof toArguments)[K]>[0]
  : Params<K> extends []
    ? never
    : ObjectForm<Params<K>[0]>;

/**
 * Validators that fit none of the three forms: they take parameters but not an optional options
 * object, and are missing from `toArguments`. Must stay `never` (checked by a type test).
 */
export type Unclassified = {
  [K in ValidatorName]: K extends Translated
    ? never
    : Params<K> extends []
      ? never
      : [ObjectForm<Params<K>[0]>] extends [never]
        ? K
        : [] extends Params<K>
          ? never
          : K;
}[ValidatorName];

/** The arguments, after the value, that the validator `name` receives for `properties`. */
export function argumentsOf(name: string, properties: object | undefined): unknown[] {
  if (hasOwn(toArguments, name))
    return (toArguments[name] as (properties: object) => unknown[])(properties ?? {});
  return properties === undefined ? [] : [properties];
}
