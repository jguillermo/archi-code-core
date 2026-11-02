import { toBoolean } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/type-primitive.exception';
import { ValueObjectBrand } from '../../shared/index';

export class BooleanType extends AbstractType<boolean> {
  static {
    ValueObjectBrand.brandKind(this, 'boolean');
  }

  protected filter(value: unknown): boolean {
    const converted = toBoolean(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Boolean', value);
    }
    return converted.value;
  }
}
