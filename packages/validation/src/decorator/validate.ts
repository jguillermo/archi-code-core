import { validator } from '../validators';
import { ValidationConfigError } from '../helpers/errors';
import { hasOwn } from '../helpers/hasOwn';
import type { Validation } from './validations';

export interface ValidationError {
  validator: string;
  message: string;
}

/**
 * Runs every validation against the value — a failure does not stop the rest — and returns one
 * error per failed validation, in order. An empty list means the value is valid.
 */
export function validate(validations: Validation[], value: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const validation of validations) {
    let passed: boolean;
    if ('fn' in validation) {
      passed = validation.fn(value);
    } else {
      if (
        !hasOwn(validator, validation.validator) ||
        typeof validator[validation.validator] !== 'function'
      ) {
        throw new ValidationConfigError(`Unknown validator "${validation.validator}"`);
      }
      passed = (validator[validation.validator] as (...args: unknown[]) => boolean)(
        value,
        validation.properties,
        validation.options,
      );
    }
    if (!passed)
      errors.push({
        validator: validation.validator,
        message: validation.message ?? `Value does not satisfy ${validation.validator}`,
      });
  }
  return errors;
}
