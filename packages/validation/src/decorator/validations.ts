import type { ValidatorRegistry } from '../validators';
import { ValidationConfigError } from '../helpers/errors';

type Tail<F> = F extends (value: any, ...rest: infer R) => boolean ? R : never;

/** Names of the registry entries that are validators (the locale tables are left out). */
export type ValidatorName = {
  [K in keyof ValidatorRegistry]: ValidatorRegistry[K] extends (...args: any[]) => boolean
    ? K
    : never;
}[keyof ValidatorRegistry];

/**
 * A built-in validator: `properties` is its second argument and `options` its third, so
 * `{ validator: 'isInt', properties: { min: 2 } }` runs `isInt(value, { min: 2 })`.
 */
export type BuiltInValidation = {
  [K in ValidatorName]: {
    validator: K;
    properties?: Tail<ValidatorRegistry[K]>[0];
    options?: Tail<ValidatorRegistry[K]>[1];
    message?: string;
  };
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

/**
 * Class decorator (classes only) that declares the validations of a class, in order. A subclass
 * inherits them: its own validations are added after the parent's.
 *
 * @example
 * @Validations([{ validator: 'isInt', properties: { min: 2 } }])
 * class Age {}
 */
export function Validations(validations: Validation[]) {
  return (target: ValidatedClass): void => {
    if (typeof target !== 'function')
      throw new ValidationConfigError('@Validations can only decorate a class');
    ownValidations.set(target, [...(ownValidations.get(target) ?? []), ...validations]);
  };
}
