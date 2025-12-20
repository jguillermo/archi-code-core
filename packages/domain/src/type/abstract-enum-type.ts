import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export abstract class AbstractEnumType<T, R extends null | undefined = undefined> extends AbstractType<T, R> {
  protected abstract getEnum(): Record<string, T>;

  protected filter(value: T | null): T | null {
    if (value === null) {
      return null;
    }
    const enumValues = Object.values(this.getEnum());
    if (!enumValues.includes(value)) {
      throw new TypePrimitiveException(`Expected one of [${enumValues.join(', ')}]`, value, '');
    }

    return value as T;
  }
}
