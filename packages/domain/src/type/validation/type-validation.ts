import type { ValidationResult } from '@archi-code/validation';

export class TypeValidation {
  static readonly nullIsValid: ValidationResult<null> = Object.freeze({
    ok: true,
    value: null,
    errors: Object.freeze([]) as readonly [],
  });
}
