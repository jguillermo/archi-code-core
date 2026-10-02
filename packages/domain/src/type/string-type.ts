import { toString as convertToString } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export class StringType extends AbstractType<string> {
  protected filter(value: unknown): string {
    const converted = convertToString(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('String', value);
    }
    return converted.value;
  }
}
