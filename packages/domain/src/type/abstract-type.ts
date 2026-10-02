import { anyToString, validate as runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { acceptValue } from './input/accept-value';
import type { ValueOf } from './required/required-mark';
import { TypeValidation } from './validation/type-validation';

export { Required } from './required/required';
export type { RequiredType } from './required/required';

export abstract class AbstractType<T> implements Validatable<T | null> {
  protected _value: T | null;
  private validation: TypeValidation<T> | null = null;

  constructor(value: T | null = null) {
    this._value = acceptValue(this, value, (input) => this.filter(input));
  }

  get value(): ValueOf<T, this> {
    return this._value as ValueOf<T, this>;
  }

  get isNull(): boolean {
    return this._value === null;
  }

  get isNotNull(): boolean {
    return !this.isNull;
  }

  get toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  validate(): ValidationResult<ValueOf<T, this>> {
    this.validation ??= new TypeValidation<T>((value) => this.validateValue(value));
    return this.validation.of(this._value) as ValidationResult<ValueOf<T, this>>;
  }

  protected validateValue(value: T): ValidationResult<T> {
    return runValidations(this.constructor as ValidatedClass, value);
  }

  protected abstract filter(value: unknown): T | null;
}
