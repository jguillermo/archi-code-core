import { toFloat } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/type-primitive.exception';
import { ValueObjectBrand } from '../../shared/index';

export class NumberType extends AbstractType<number> {
  static {
    ValueObjectBrand.brandKind(this, 'number');
  }

  protected filter(value: unknown): number {
    const converted = toFloat(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Number', value);
    }
    return converted.value;
  }
}
