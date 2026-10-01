import { validator } from '../validators';
import type { ValidatorRegistry } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
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

/**
 * The `properties` of a built-in validation: the validator's options object (its second argument),
 * or nothing (never) for the validators that only take the value.
 */
export type ValidationProperties<K extends ValidatorName> =
  Params<K> extends [] ? never : NonNullable<Params<K>[0]>;

// `properties` is required when the validator needs something, forbidden when it takes nothing.
type PropertiesField<P> = [P] extends [never]
  ? { properties?: undefined }
  : Record<never, never> extends P
    ? { properties?: P }
    : { properties: P };

/**
 * A built-in validator: `properties` is the validator's options object, so
 * `{ validator: 'isHash', properties: { algorithm: 'md5' } }` runs `isHash(value, { algorithm: 'md5' })`.
 */
export type BuiltInValidation = {
  [K in ValidatorName]: {
    validator: K;
    message?: string;
    custom?: undefined;
    fn?: undefined;
  } & PropertiesField<ValidationProperties<K>>;
}[ValidatorName];

/** A custom validation: `fn` decides, `custom` is the name shown in the errors. */
export interface CustomValidation {
  custom: string;
  fn: (value: unknown) => boolean;
  message?: string;
  validator?: undefined;
}

export type Validation = BuiltInValidation | CustomValidation;

/** Any class, abstract ones included. */
export type ValidatedClass = abstract new (...args: any[]) => unknown;

// Registry key, in the global symbol registry so every copy of this module shares one registry:
// the CommonJS and ES module builds, or two installed copies of the package. `v1` is the shape of
// what is stored; a version that stores something else must use a new key.
const REGISTRY = Symbol.for('@archi-code/validation/decorator.v1');

/** Validations declared by each class, without the inherited ones. */
export const ownValidations: WeakMap<ValidatedClass, Validation[]> = ((
  globalThis as { [REGISTRY]?: WeakMap<ValidatedClass, Validation[]> }
)[REGISTRY] ??= new WeakMap());

export function isCustom(validation: Validation): validation is CustomValidation {
  return validation.custom !== undefined;
}

/** Whether `name` is a validator of the registry (the locale tables are not). */
export function isValidatorName(name: unknown): name is ValidatorName {
  return hasOwn(validator, name) && typeof validator[name] === 'function';
}

// Rejects what the types forbid but plain JavaScript (or a cast) can still pass, so a wrong
// declaration fails when the class is decorated instead of on the first `validate`.
function assertShape(validation: unknown): asserts validation is Validation {
  if (validation === null || typeof validation !== 'object')
    throw new ValidationConfigError('A validation must be an object');
  const { validator: name, custom, fn } = validation as Record<string, unknown>;
  if (name !== undefined && custom !== undefined)
    throw new ValidationConfigError('A validation cannot have both "validator" and "custom"');
  if (custom !== undefined) {
    if (typeof custom !== 'string' || custom === '')
      throw new ValidationConfigError('"custom" must be a non-empty string');
    if (typeof fn !== 'function')
      throw new ValidationConfigError(`Custom "${custom}" needs a "fn" function`);
    return;
  }
  if (name === undefined)
    throw new ValidationConfigError('A validation needs "validator" or "custom"');
  if (!isValidatorName(name))
    throw new ValidationConfigError(`Unknown validator "${String(name)}"`);
}

/** Identity of a validation: a built-in and a custom with the same name are different ones. */
export function keyOf(validation: Validation): string {
  return isCustom(validation) ? `custom:${validation.custom}` : `validator:${validation.validator}`;
}

// Frozen copy of the plain objects and arrays in `value`, so neither the caller's objects nor
// what validate reads can change a class's validations. Anything else (RegExp, functions…)
// is kept as is: freezing a RegExp would break its `lastIndex`.
function snapshot<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(snapshot)) as T;
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = snapshot(item);
    return Object.freeze(copy) as T;
  }
  return value;
}

/**
 * Class decorator (classes only) that declares the validations of a class, in order. A subclass
 * inherits them: its own validations are added after the parent's, and one matching a parent's
 * (same built-in validator or same custom name) replaces it. Applying the decorator again to a
 * class works the same way. A list cannot declare the same validation twice. The declaration is
 * checked when the class is decorated: a malformed validation or an unknown validator throws
 * `ValidationConfigError` there.
 *
 * @example
 * @Validations([{ validator: 'isInt', properties: { min: 2 } }])
 * class Age {}
 */
export function Validations(validations: Validation[]) {
  return (target: ValidatedClass): void => {
    if (typeof target !== 'function')
      throw new ValidationConfigError('@Validations can only decorate a class');
    if (!Array.isArray(validations))
      throw new ValidationConfigError('@Validations expects an array of validations');
    const declared = new Set<string>();
    for (const validation of validations) {
      assertShape(validation);
      const key = keyOf(validation);
      if (declared.has(key))
        throw new ValidationConfigError(
          isCustom(validation)
            ? `Custom "${validation.custom}" is declared more than once`
            : `Validator "${validation.validator}" is declared more than once`,
        );
      declared.add(key);
    }
    const own = new Map((ownValidations.get(target) ?? []).map((v) => [keyOf(v), v]));
    for (const validation of validations) own.set(keyOf(validation), snapshot(validation));
    ownValidations.set(target, [...own.values()]);
  };
}
