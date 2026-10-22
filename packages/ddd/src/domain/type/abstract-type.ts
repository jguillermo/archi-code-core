import { anyToString, runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { RequiredMark } from './required/required-mark';
import type { ValueOf } from './required/required-mark';
import { RequiredValueException, ValidationException } from '../../exceptions/index';
import type { ValidationIssue } from '../../exceptions/index';

const VALUE_OBJECT: unique symbol = Symbol.for('@archi-code/ddd/value-object.v1');

export abstract class AbstractType<T, Input = T> implements Validatable<T | null> {
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

  constructor(value: Input | null = null) {
    this._value = value === null || value === undefined ? null : this.filter(value);
    if (this._value === null && RequiredMark.isMarked(this)) {
      throw new RequiredValueException(this.constructor.name, value);
    }
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

  equals<E extends AbstractType<any>>(other: E): boolean {
    return other?.constructor === this.constructor && this.hasSameValue(other as unknown as this);
  }

  protected hasSameValue(other: this): boolean {
    return this._value === other._value;
  }

  validate(): ValidationResult<ValueOf<T, this>> {
    return this.runRules(this._value as ValueOf<T, this>);
  }

  protected brokenRules(value: unknown): ValidationIssue[] {
    return this.runRules(value).errors.map((error) => ({
      field: null,
      code: 'validator' in error ? error.validator : error.custom,
      message: `${this.constructor.name}: ${error.message}`,
    }));
  }

  protected abstract filter(value: unknown): T | null;

  private runRules<V>(value: V): ValidationResult<V> {
    return runValidations(this.constructor as ValidatedClass, value);
  }
}
