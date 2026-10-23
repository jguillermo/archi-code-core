import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/type-primitive.exception';

const NUMERIC_TEXT = /^-?\d+(?:\.\d+)?$/;

export abstract class EnumType<T extends string | number> extends AbstractType<T> {
  protected abstract getEnum(): Record<string, string | number>;

  protected filter(value: unknown): T {
    const options = this.options();
    const option = options.find((candidate) => EnumType.matches(candidate, value));
    if (option === undefined) {
      throw new TypePrimitiveException(`Expected one of [${options.join(', ')}]`, value, '');
    }
    return option;
  }

  private static matches(option: string | number, value: unknown): boolean {
    return (
      option === value ||
      (typeof option === 'number' &&
        typeof value === 'string' &&
        NUMERIC_TEXT.test(value) &&
        Number(value) === option)
    );
  }

  private options(): T[] {
    const enumObject = this.getEnum();
    return Object.entries(enumObject)
      .filter(([, option]) => typeof enumObject[option] !== 'number')
      .map(([, option]) => option as T);
  }
}
