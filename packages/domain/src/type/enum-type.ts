import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export abstract class EnumType<T extends string | number> extends AbstractType<T> {
  protected abstract getEnum(): Record<string, string | number>;

  protected filter(value: unknown): T | null {
    if (value === null) {
      return null;
    }
    const options = this.options();
    if (!options.includes(value as T)) {
      throw new TypePrimitiveException(`Expected one of [${options.join(', ')}]`, value, '');
    }
    return value as T;
  }

  private options(): T[] {
    const enumObject = this.getEnum();
    return Object.entries(enumObject)
      .filter(([, option]) => typeof enumObject[option] !== 'number')
      .map(([, option]) => option as T);
  }
}
