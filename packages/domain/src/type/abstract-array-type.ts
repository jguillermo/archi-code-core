import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { DomainException } from '../exceptions';
import { PrimitiveType } from '../primitive/primitive-type';

@AddValidate([{ validator: 'IsArray' }])
export abstract class AbstractArrayType<T extends AbstractType<any>, R extends null | undefined = undefined> extends AbstractType<Array<PrimitiveType<T>>, R> {
  abstract getItemClass(value: PrimitiveType<T>): T;

  protected filter(value: any): any {
    if (value === null) {
      return null;
    }
    if (!Array.isArray(value)) {
      throw new DomainException(`value ${value} is not a Array.`);
    }
    return value.map((item: any) => this.getItemClass(item)).map((item) => item.value);
  }

  isValid(): boolean {
    if (this.isNull) {
      return false;
    }
    return super.isValid() && Array.isArray(this.value) && this.value.every((item) => this.getItemClass(item).isValid());
  }

  validatorMessageStr(separator: string = ',', customReplacement: string = ''): string {
    if (this.isNull) {
      return 'Value mas be to array';
    }
    let str = super.validatorMessageStr(separator, customReplacement);

    const strItems = this.value?.map((item, index: number) => {
      const txtItemMsg = this.getItemClass(item).validatorMessageStr(separator, customReplacement);
      return txtItemMsg === '' ? '' : `Item ${index + 1}: ${txtItemMsg}`;
    });
    const filters = strItems?.filter((item) => item !== '');
    if (filters && filters.length > 0) {
      if (str === '') {
        str = filters.join(`${separator} `);
      } else {
        str += separator + filters.join(`${separator} `);
      }
    }
    return str;
  }

  get toString(): string {
    return !this.value ? '' : this.value.map((item) => this.getItemClass(item).toString).join(', ');
  }

  get items(): T[] | null {
    if (this.value === null) {
      return null;
    }
    return this.value?.map((item) => this.getItemClass(item));
  }

  addItem(value: PrimitiveType<T>): void {
    if (this.value === null) {
      this._value = [];
    }
    this.value?.push(this.getItemClass(value).value);
  }

  hasItem(value: PrimitiveType<T>): boolean {
    const item = this.getItemClass(value);
    return this.value?.some((itemValue) => itemValue === item.value) ?? false;
  }

  removeItem(value: PrimitiveType<T>): void {
    if (this.value === null) {
      return;
    }
    const item = this.getItemClass(value);
    this._value = this.value?.filter((itemValue) => itemValue !== item.value) ?? [];
  }

  setItem(value: PrimitiveType<T>): void {
    if (this.hasItem(value)) {
      return;
    }
    this.addItem(value);
  }
}
