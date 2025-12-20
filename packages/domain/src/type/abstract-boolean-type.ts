import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { CanBeBooleanValidator } from '../validator/decorator/custom/can-be-boolean';
import { BooleanValidator } from '../validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

@AddValidate([{ validator: CanBeBooleanValidator }])
export class AbstractBooleanType<R extends null | undefined = undefined> extends AbstractType<boolean, R> {
  protected filter(value: any): any {
    if (value === null) {
      return null;
    }
    if (!BooleanValidator.canBeBoolean(value)) {
      throw new TypePrimitiveException('Boolean', value);
    }
    if (typeof value === 'string') {
      value = value.toLowerCase().trim();
      return value === 'true' || value === '1';
    }
    return !!value;
  }
}
