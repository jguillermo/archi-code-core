import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { JsonValidator } from '../validator';
import { CanBeJson } from '../validator/decorator/custom/can-be-json';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export type JsonTypeValue = {
  [p: string]: any;
};

@AddValidate([{ validator: CanBeJson }])
export class AbstractJsonType<T extends JsonTypeValue, R extends null | undefined = undefined> extends AbstractType<T, R> {
  protected filter(value: any): any {
    if (value === null) {
      return null;
    }
    if (!JsonValidator.canBeJson(value)) {
      throw new TypePrimitiveException('Json', value);
    }
    return typeof value === 'string' ? JSON.parse(value) : value;
  }
}
