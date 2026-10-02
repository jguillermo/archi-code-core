import { anyToString, validate as runValidations } from '@archi-code/validation';
import type { Validatable, ValidatedClass, ValidationResult } from '@archi-code/validation';
import { RequiredValueException } from '../exceptions/domain/required-value.exception';

const REQUIRED: unique symbol = Symbol.for('@archi-code/domain/required.v1');

interface RequiredMark {
  readonly [REQUIRED]: true;
}

type ValueOf<T, I> = I extends RequiredMark ? T : T | null;

const nullIsValid: ValidationResult<null> = Object.freeze({
  ok: true,
  value: null,
  errors: Object.freeze([]) as readonly [],
});

function isMissing(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

export abstract class AbstractType<T> implements Validatable<T | null> {
  declare readonly [REQUIRED]?: true;
  protected _value: T | null;
  private lastValidation: ValidationResult<T | null> | null = null;

  constructor(value: T | null = null) {
    this._value = isMissing(value) ? null : this.filter(value);
    if (this._value === null && this[REQUIRED] === true) {
      throw new RequiredValueException(this.constructor.name, value);
    }
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

  validate(): ValidationResult<ValueOf<T, this>> {
    if (this.lastValidation === null || !Object.is(this.lastValidation.value, this._value)) {
      this.lastValidation = this._value === null ? nullIsValid : this.validateValue(this._value);
    }
    return this.lastValidation as ValidationResult<ValueOf<T, this>>;
  }

  get toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  protected validateValue(value: T): ValidationResult<T> {
    return runValidations(this.constructor as ValidatedClass, value);
  }

  protected abstract filter(value: unknown): T | null;
}

type TypeClass = abstract new (value?: any) => AbstractType<any>;

type RequiredValueOf<C extends TypeClass> = Exclude<InstanceType<C>['value'], null>;

export type RequiredType<C extends TypeClass> = Omit<C, 'prototype'> &
  (abstract new (value: RequiredValueOf<C>) => InstanceType<C> & RequiredMark);

export function Required<C extends TypeClass>(Base: C): RequiredType<C> {
  abstract class RequiredValue extends (Base as unknown as abstract new (
    ...args: any[]
  ) => AbstractType<unknown>) {}
  Object.defineProperty(RequiredValue.prototype, REQUIRED, { value: true });
  return RequiredValue as unknown as RequiredType<C>;
}
