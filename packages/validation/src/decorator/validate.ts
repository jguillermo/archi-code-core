import { validator } from '../validators';
import { isRequired as hasValue } from '../validators/isRequired';
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

const IS_REQUIRED = keyOf({ validator: 'isRequired' });

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

function errorOf(validation: Validation, value: unknown): ValidationError | null {
  if (isCustom(validation)) {
    if (validation.fn(value)) return null;
    return {
      custom: validation.custom,
      message: validation.message ?? `Value does not satisfy ${validation.custom}`,
    };
  }
  const name = validation.validator;
  // The registry is shared across package copies: another version may store an unknown validator.
  if (!isValidatorName(name)) {
    throw new ValidationConfigError(`Unknown validator "${name}"`);
  }
  const run = validator[name] as (value: unknown, options?: object) => boolean;
  if (run(value, validation.properties)) return null;
  return { validator: name, message: validation.message ?? `Value does not satisfy ${name}` };
}

export function runValidations<T>(target: ValidatedClass, value: T): ValidationResult<T> {
  if (typeof target !== 'function')
    throw new ValidationConfigError('runValidations expects a class, not an instance or a value');

  const declared = validationsOf(target);
  const isRequired = declared.filter((validation) => keyOf(validation) === IS_REQUIRED);
  const isOptional = isRequired.length === 0;

  let toRun: Validation[];
  if (hasValue(value)) toRun = declared;
  else if (isOptional) toRun = [];
  else toRun = isRequired;

  const errors: ValidationError[] = [];
  for (const validation of toRun) {
    const error = errorOf(validation, value);
    if (error !== null) errors.push(error);
  }

  return Object.freeze(
    errors.length === 0
      ? { ok: true, value, errors: Object.freeze([]) as readonly [] }
      : { ok: false, value, errors: Object.freeze(errors.map((error) => Object.freeze(error))) },
  );
}
