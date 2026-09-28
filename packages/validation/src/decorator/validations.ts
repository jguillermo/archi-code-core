import { ValidationConfigError } from '../helpers/errors';
import type { ValidatorName, ValidationProperties } from './properties';

export type { ValidatorName, ValidationProperties } from './properties';

// `properties` is required when the validator needs something, forbidden when it takes nothing.
type PropertiesField<P> = [P] extends [never]
  ? { properties?: undefined }
  : Record<never, never> extends P
    ? { properties?: P }
    : { properties: P };

/**
 * A built-in validator: `properties` is a single object turned into the validator's arguments, so
 * `{ validator: 'isInt', properties: { min: 2 } }` runs `isInt(value, { min: 2 })` and
 * `{ validator: 'isHash', properties: { algorithm: 'md5' } }` runs `isHash(value, 'md5')`.
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

/** Validations declared by each class, without the inherited ones. */
export const ownValidations = new WeakMap<ValidatedClass, Validation[]>();

export function isCustom(validation: Validation): validation is CustomValidation {
  return validation.custom !== undefined;
}

/** Identity of a validation: a built-in and a custom with the same name are different ones. */
export function keyOf(validation: Validation): string {
  return isCustom(validation) ? `custom:${validation.custom}` : `validator:${validation.validator}`;
}

// Frozen copy of the plain objects and arrays in `value`, so neither the caller's objects nor
// what getValidations returns can change a class's validations. Anything else (RegExp, functions…)
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
 * class works the same way. A list cannot declare the same validation twice.
 *
 * @example
 * @Validations([{ validator: 'isInt', properties: { min: 2 } }])
 * class Age {}
 */
export function Validations(validations: Validation[]) {
  return (target: ValidatedClass): void => {
    if (typeof target !== 'function')
      throw new ValidationConfigError('@Validations can only decorate a class');
    const declared = new Set<string>();
    for (const validation of validations) {
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
