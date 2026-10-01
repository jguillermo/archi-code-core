import { validator } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
import { isCustom, isValidatorName, keyOf, ownValidations } from './validations';
import type { Validation, ValidatedClass } from './validations';

/** A failed validation: `validator` for a built-in one, `custom` for a custom one. */
export type ValidationError =
  | { validator: string; message: string }
  | { custom: string; message: string };

// The validations of a class, inherited ones included, in validation order: the root parent's
// first, then each subclass down to `target`. A subclass that declares a validation of its parent
// (same built-in validator, or same custom name) replaces the parent's declaration, which keeps its
// place in the order. A built-in and a custom with the same name are independent.
function validationsOf(target: ValidatedClass): Validation[] {
  const chain: ValidatedClass[] = [];
  for (
    let current = target;
    current !== Function.prototype && current !== null;
    current = Object.getPrototypeOf(current)
  ) {
    chain.unshift(current);
  }
  const byKey = new Map<string, Validation>();
  for (const cls of chain) {
    for (const validation of ownValidations.get(cls) ?? []) {
      byKey.set(keyOf(validation), validation);
    }
  }
  return [...byKey.values()];
}

/**
 * Runs the validations declared with `@Validations` on `target` and its parents against the value
 * — a failure does not stop the rest — and returns one error per failed validation, in order. An
 * empty list means the value is valid.
 *
 * @example
 * @Validations([{ validator: 'isInt', properties: { min: 2 } }])
 * class Age {}
 * validate(Age, '1'); // [{ validator: 'isInt', message: 'Value does not satisfy isInt' }]
 */
export function validate(target: ValidatedClass, value: unknown): ValidationError[] {
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
    // The registry is shared with every copy of the package: one of another version may have
    // stored a validator this copy does not have.
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
  return errors;
}
