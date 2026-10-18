import { anyToString, runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { TypeInput } from './input/type-input';
import { ValueEquality } from './equality/value-equality';
import type { ValueOf } from './required/required-mark';
import { ValidationException } from '../../exceptions/index';
import type { ValidationIssue } from '../../exceptions/index';

type JsonValue<T> = T extends Date ? string : T;

const VALUE_OBJECT: unique symbol = Symbol.for('@archi-code/ddd/value-object.v1');

export abstract class AbstractType<T> implements Validatable<T | null> {
  protected readonly _value: T | null;

  static {
    Object.defineProperty(this.prototype, VALUE_OBJECT, { value: true });
  }

  static [Symbol.hasInstance](candidate: unknown): boolean {
    return (
      Function.prototype[Symbol.hasInstance].call(this, candidate) ||
      (this === AbstractType &&
        typeof candidate === 'object' &&
        candidate !== null &&
        (candidate as Record<symbol, unknown>)[VALUE_OBJECT] === true)
    );
  }

  constructor(value: T | null = null) {
    this._value = TypeInput.accept(this, value, (input) => this.filter(input));
    const brokenRules = this.brokenRules(this._value);
    if (brokenRules.length > 0) {
      throw new ValidationException(brokenRules);
    }
  }

  get value(): ValueOf<T, this> {
    return this._value as ValueOf<T, this>;
  }

  get isNull(): boolean {
    return this._value === null;
  }

  toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  toJSON(): ValueOf<JsonValue<T>, this> {
    const value = this._value;
    return (value instanceof Date ? value.toISOString() : value) as ValueOf<JsonValue<T>, this>;
  }

  equals(other: unknown): boolean {
    return (
      typeof other === 'object' &&
      other !== null &&
      other.constructor === this.constructor &&
      ValueEquality.equals(this._value, (other as AbstractType<unknown>)._value)
    );
  }

  validate(): ValidationResult<ValueOf<T, this>> {
    return runValidations(this.constructor as ValidatedClass, this._value) as ValidationResult<
      ValueOf<T, this>
    >;
  }

  protected brokenRules(value: unknown): ValidationIssue[] {
    return runValidations(this.constructor as ValidatedClass, value).errors.map((error) => ({
      field: null,
      message: `${this.constructor.name}: ${error.message}`,
    }));
  }

  protected abstract filter(value: unknown): T | null;
}
