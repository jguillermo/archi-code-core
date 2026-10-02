import { toBoolean } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export class BooleanType extends AbstractType<boolean> {
  protected filter(value: unknown): boolean {
    const converted = toBoolean(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Boolean', value);
    }
    return converted.value;
  }
}
