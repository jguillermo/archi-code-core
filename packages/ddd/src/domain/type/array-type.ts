import { toArray } from '@archi-code/validation';
import type { ValidationError, ValidationResult } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { Immutable } from './immutable/immutable';
import { ValueEquality } from './equality/value-equality';
import type { ValueOf } from './required/required-mark';
import { ValueObjects } from './value-objects/value-objects';
import { TypePrimitiveException, ValidationException } from '../../exceptions/index';

type ItemValue<Item extends AbstractType<any>> = Item['value'];

export abstract class ArrayType<Item extends AbstractType<any>> extends AbstractType<
  ItemValue<Item>[]
> {
  protected abstract createItem(value: unknown): Item;

  get items(): Item[] {
    return (this._value ?? []).map((value) => this.createItem(value));
  }

  toString(): string {
    return this.items.map((item) => item.toString()).join(', ');
  }

  hasItem(value: ItemValue<Item>): boolean {
    const itemValue = this.createItem(value).value;
    return (this._value ?? []).some((current) => ValueEquality.equals(current, itemValue));
  }

  withItem(value: ItemValue<Item>): this {
    return this.copyWith([...(this._value ?? []), value]);
  }

  withoutItem(value: ItemValue<Item>): this {
    if (this._value === null) {
      return this;
    }
    const itemValue = this.createItem(value).value;
    return this.copyWith(
      this._value.filter((current) => !ValueEquality.equals(current, itemValue)),
    );
  }

  protected filter(value: unknown): ItemValue<Item>[] {
    const converted = toArray(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Array', value);
    }
    try {
      return Immutable.freeze(
        ValueObjects.buildList(converted.value, (item) => this.createItem(item).value),
      );
    } catch (error) {
      if (error instanceof ValidationException) {
        throw new ValidationException([...this.brokenRules(converted.value), ...error.errors]);
      }
      throw error;
    }
  }

  validate(): ValidationResult<ValueOf<ItemValue<Item>[], this>> {
    const own = super.validate();
    /* v8 ignore start -- @preserve */
    const itemErrors = (this._value ?? []).flatMap((itemValue, index) =>
      this.createItem(itemValue)
        .validate()
        .errors.map(
          (error): ValidationError =>
            Object.freeze({ ...error, message: `Item ${index + 1}: ${error.message}` }),
        ),
    );
    if (itemErrors.length === 0) {
      return own;
    }
    return Object.freeze({
      ok: false,
      value: own.value,
      errors: Object.freeze([...own.errors, ...itemErrors]),
    });
    /* v8 ignore stop -- @preserve */
  }

  private copyWith(values: unknown[]): this {
    const SameType = this.constructor as new (value: unknown) => this;
    return new SameType(values);
  }
}
