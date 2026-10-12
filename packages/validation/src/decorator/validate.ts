import { validator } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
import { isCustom, isValidatorName, keyOf, ownValidations } from './validations';
import type { Validation, ValidatedClass } from './validations';

export type ValidationError =
  | { validator: string; message: string }
  | { custom: string; message: string };

export interface ValidationSuccess<T> {
  readonly ok: true;
  readonly value: T;
  readonly errors: readonly [];
}

export interface ValidationFailure<T> {
  readonly ok: false;
  readonly value: T;
  readonly errors: readonly ValidationError[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure<T>;

export interface Validatable<T> {
  validate(): ValidationResult<T>;
}

function validationsOf(target: ValidatedClass): Validation[] {
  const rootFirstChain: ValidatedClass[] = [];
  for (
    let current = target;
    current !== Function.prototype && current !== null;
    current = Object.getPrototypeOf(current)
  ) {
    rootFirstChain.unshift(current);
  }
  const byKey = new Map<string, Validation>();
  for (const cls of rootFirstChain) {
    for (const validation of ownValidations.get(cls) ?? []) {
      byKey.set(keyOf(validation), validation);
    }
  }
  return [...byKey.values()];
}

export function validate<T>(target: ValidatedClass, value: T): ValidationResult<T> {
  if (typeof target !== 'function')
    throw new ValidationConfigError('validate expects a class, not an instance or a value');
  const errors: ValidationError[] = [];
  for (const validation of validationsOf(target)) {
    if (isCustom(validation)) {
      if (!validation.fn(value))
        errors.push({
          custom: validation.custom,
          message: validation.message ?? `Value does not satisfy ${validation.custom}`,
        });
      continue;
    }
    const name = validation.validator;
    // The registry is shared across package copies: another version may store an unknown validator.
    if (!isValidatorName(name)) {
      throw new ValidationConfigError(`Unknown validator "${name}"`);
    }
    const run = validator[name] as (value: unknown, options?: object) => boolean;
    if (!run(value, validation.properties))
      errors.push({
        validator: name,
        message: validation.message ?? `Value does not satisfy ${name}`,
      });
  }
  return Object.freeze(
    errors.length === 0
      ? { ok: true, value, errors: Object.freeze([]) as readonly [] }
      : { ok: false, value, errors: Object.freeze(errors.map((error) => Object.freeze(error))) },
  );
}
