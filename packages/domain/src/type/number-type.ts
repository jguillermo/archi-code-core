import { toFloat } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export class NumberType extends AbstractType<number> {
  protected filter(value: unknown): number {
    const converted = toFloat(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Number', value);
    }
    return converted.value;
  }
}
