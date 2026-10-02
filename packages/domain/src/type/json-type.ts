import { toJson } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { deepFreeze } from './immutable/deep-freeze';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export type JsonTypeValue = Record<string, any>;

export class JsonType<T extends JsonTypeValue = JsonTypeValue> extends AbstractType<T> {
  protected filter(value: unknown): T {
    const converted = toJson(value);
    if (!converted.ok) {
      throw new TypePrimitiveException('Json', value);
    }
    return deepFreeze(JSON.parse(JSON.stringify(converted.value))) as T;
  }
}
