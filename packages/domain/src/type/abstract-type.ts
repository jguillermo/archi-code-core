import { anyToString, validate as runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { TypeInput } from './input/type-input';
import type { ValueOf } from './required/required-mark';
import { TypeValidation } from './validation/type-validation';

export { Required } from './required/required';
export type { RequiredType } from './required/required';

export abstract class AbstractType<T> implements Validatable<T | null> {
  protected _value: T | null;

  constructor(value: T | null = null) {
    this._value = TypeInput.accept(this, value, (input) => this.filter(input));
  }

  get value(): ValueOf<T, this> {
    return this._value as ValueOf<T, this>;
  }

  get isNull(): boolean {
    return this._value === null;
  }

  get toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  validate(): ValidationResult<ValueOf<T, this>> {
    const result =
      this._value === null ? TypeValidation.nullIsValid : this.validateValue(this._value);
    return result as ValidationResult<ValueOf<T, this>>;
  }

  protected validateValue(value: T): ValidationResult<T> {
    return runValidations(this.constructor as ValidatedClass, value);
  }

  protected abstract filter(value: unknown): T | null;
}
