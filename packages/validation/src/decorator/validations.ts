import type { ValidatorRegistry } from '../validators';
import { ValidationConfigError } from '../helpers/errors';

type Tail<F> = F extends (value: any, ...rest: infer R) => boolean ? R : never;

/** Names of the registry entries that are validators (the locale tables are left out). */
export type ValidatorName = {
  [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: any[]) => boolean
    ? K
    : never;
}[keyof ValidatorRegistry];

// `properties` is required when the validator's second parameter is.
type Args<P extends unknown[]> = P extends []
  ? { properties?: undefined; options?: undefined }
  : [] extends P
    ? { properties?: P[0]; options?: P[1] }
    : { properties: P[0]; options?: P[1] };

/**
 * A built-in validator: `properties` is its second argument and `options` its third, so
 * `{ validator: 'isInt', properties: { min: 2 } }` runs `isInt(value, { min: 2 })`.
 */
export type BuiltInValidation = {
  [K in ValidatorName]: { validator: K; message?: string } & Args<Tail<ValidatorRegistry[K]>>;
}[ValidatorName];

/** A custom validation: `fn` decides, `validator` is the name shown in the errors. */
export interface CustomValidation {
  validator: string;
  fn: (value: unknown) => boolean;
  message?: string;
}

export type Validation = BuiltInValidation | CustomValidation;

/** Any class, abstract ones included. */
export type ValidatedClass = abstract new (...args: any[]) => unknown;

/** Validations declared by each class, without the inherited ones. */
export const ownValidations = new WeakMap<ValidatedClass, Validation[]>();

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
 * inherits them: its own validations are added after the parent's, and one naming a validator the
 * parent already declares replaces it. A validator can be declared only once per class.
 *
 * @example
 * @Validations([{ validator: 'isInt', properties: { min: 2 } }])
 * class Age {}
 */
export function Validations(validations: Validation[]) {
  return (target: ValidatedClass): void => {
    if (typeof target !== 'function')
      throw new ValidationConfigError('@Validations can only decorate a class');
    const own = [...(ownValidations.get(target) ?? []), ...validations.map(snapshot)];
    const names = new Set<string>();
    for (const { validator } of own) {
      if (names.has(validator))
        throw new ValidationConfigError(`Validator "${validator}" is declared more than once`);
      names.add(validator);
    }
    ownValidations.set(target, own);
  };
}
