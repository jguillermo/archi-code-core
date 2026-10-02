import { toArray } from '@archi-code/validation';
import type { ValidationError, ValidationResult } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { Immutable } from './immutable/immutable';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

type ItemValue<Item extends AbstractType<any>> = Item['value'];

export abstract class ArrayType<Item extends AbstractType<any>> extends AbstractType<
  ItemValue<Item>[]
> {
  protected abstract createItem(value: unknown): Item;

  get items(): Item[] {
    return (this._value ?? []).map((value) => this.createItem(value));
  }

  get toString(): string {
    return this.items.map((item) => item.toString).join(', ');
  }

  hasItem(value: ItemValue<Item>): boolean {
    const itemValue = this.createItem(value).value;
    return (this._value ?? []).some((current) => Object.is(current, itemValue));
  }

  addItem(value: ItemValue<Item>): void {
    this._value = Immutable.freeze([...(this._value ?? []), this.createItem(value).value]);
  }

  setItem(value: ItemValue<Item>): void {
    if (!this.hasItem(value)) {
      this.addItem(value);
    }
  }

  removeItem(value: ItemValue<Item>): void {
    if (this._value === null) {
      return;
    }
    const itemValue = this.createItem(value).value;
    this._value = Immutable.freeze(this._value.filter((current) => !Object.is(current, itemValue)));
  }

  protected filter(value: unknown): ItemValue<Item>[] {
    const converted = toArray(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Array', value);
    }
    return Immutable.freeze(converted.value.map((item) => this.createItem(item).value));
  }

  protected validateValue(value: ItemValue<Item>[]): ValidationResult<ItemValue<Item>[]> {
    const own = super.validateValue(value);
    const itemErrors = value.flatMap((itemValue, index) =>
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
      value,
      errors: Object.freeze([...own.errors, ...itemErrors]),
    });
  }
}
