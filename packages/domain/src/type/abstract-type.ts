import { universalToString } from '@code-core/common';
import { TypeValidatorInterface } from '../validator';
import { validateSync } from 'class-validator';

export abstract class AbstractType<T, R extends null | undefined = undefined> implements TypeValidatorInterface {
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
    return validateSync(this).length === 0;
  }

  validatorMessageObj(customReplacement: string = ''): object {
    const errors = validateSync(this);
    const data = errors.map((error) => {
      if (error.constraints) {
        return Object.entries(error.constraints)
          .map(([key, message]) => {
            return { [key]: message.replace('_value ', customReplacement ? `${customReplacement} ` : '') };
          })
          .reduce((acc, curr) => ({ ...acc, ...curr }), {});
      }
      return {};
    });
    return data.length > 0 ? data[0] : {};
  }

  validatorMessageStr(separator: string = ',', customReplacement: string = ''): string {
    return Object.values(this.validatorMessageObj(customReplacement)).join(`${separator} `);
  }

  get toString(): string {
    return this.isNull ? '' : universalToString(this._value);
  }

  protected abstract filter(value: any | null): any | null;
}
