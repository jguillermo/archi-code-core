import { validator } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import { isCustom } from './validations';
import type { Validation } from './validations';

/** A failed validation: `validator` for a built-in one, `custom` for a custom one. */
export type ValidationError =
  | { validator: string; message: string }
  | { custom: string; message: string };

/**
 * Runs every validation against the value — a failure does not stop the rest — and returns one
 * error per failed validation, in order. An empty list means the value is valid.
 */
export function validate(validations: Validation[], value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const validation of validations) {
    if (isCustom(validation)) {
      if (!validation.fn(value))
        errors.push({
          custom: validation.custom,
          message: validation.message ?? `Value does not satisfy ${validation.custom}`,
        });
      continue;
    }
    const name = validation.validator;
    if (!hasOwn(validator, name) || typeof validator[name] !== 'function') {
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
