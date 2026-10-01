import { anyToString } from '@archi-code/validation';
import { validate } from '@archi-code/validation/src';

export abstract class AbstractType<T, R extends null | undefined = undefined> {
  protected _value: R extends null ? T | null : T;

  constructor(value: R extends null ? T | null : T) {
    this._value = this.filter(value ?? null);
  }

  get value(): R extends null ? T | null : T {
    return this._value;
  }

  get isNull(): boolean {
    return this._value === null;
  }

  get isNotNull(): boolean {
    return !this.isNull;
  }

  isValid(): boolean {
    return validate(this, this._value).length === 0;
  }

  isValidMessages(): string[] {
    return [];
  }

  get toString(): string {
    return this.isNull ? '' : anyToString(this._value);
  }

  protected abstract filter(value: any | null): any | null;
}
