import { anyToString, validate as runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';

type TypeValue<T, R extends null | undefined> = R extends null ? T | null : T;

export abstract class AbstractType<
  T,
  R extends null | undefined = undefined,
> implements Validatable<TypeValue<T, R>> {
  protected _value: TypeValue<T, R>;
  private lastValidation: ValidationResult<TypeValue<T, R>> | null = null;

  constructor(value: TypeValue<T, R>) {
    this._value = this.filter(value ?? null);
  }

  get value(): TypeValue<T, R> {
    return this._value;
  }

  get isNull(): boolean {
    return this._value === null;
  }

  get isNotNull(): boolean {
    return !this.isNull;
  }

  validate(): ValidationResult<TypeValue<T, R>> {
    if (this.lastValidation === null || !Object.is(this.lastValidation.value, this._value)) {
      this.lastValidation = runValidations(this.constructor as ValidatedClass, this._value);
    }
    return this.lastValidation;
  }

  get toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  protected abstract filter(value: any | null): any | null;
}
