import { anyToString, runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { TypeInput } from './input/type-input';
import type { ValueOf } from './required/required-mark';

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
    return runValidations(this.constructor as ValidatedClass, this._value) as ValidationResult<
      ValueOf<T, this>
    >;
  }

  protected abstract filter(value: unknown): T | null;
}
