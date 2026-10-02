import type { ValidationResult } from '@archi-code/validation';

const nullIsValid: ValidationResult<null> = Object.freeze({
  ok: true,
  value: null,
  errors: Object.freeze([]) as readonly [],
});

export class TypeValidation<T> {
  private last: ValidationResult<T | null> | null = null;

  constructor(private readonly validateValue: (value: T) => ValidationResult<T>) {}

  of(value: T | null): ValidationResult<T | null> {
    if (this.last === null || !Object.is(this.last.value, value)) {
      this.last = value === null ? nullIsValid : this.validateValue(value);
    }
    return this.last;
  }
}
