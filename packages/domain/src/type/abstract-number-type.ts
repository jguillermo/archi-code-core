import { AbstractType } from './abstract-type';
import { NumberValidator } from '../validator';
import { AddValidate } from '../validator/decorator/type-validator';
import { CanBeNumberValidator } from '../validator/decorator/custom/can-be-number';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

@AddValidate([{ validator: CanBeNumberValidator }])
export class AbstractNumberType<R extends null | undefined = undefined> extends AbstractType<number, R> {
  protected filter(value: any): any {
    if (value === null) {
      return null;
    }

    if (!NumberValidator.canBeNumber(value)) {
      throw new TypePrimitiveException('Number', value);
    }
    const number = Number(value);
    return isNaN(number) ? NaN : number.valueOf();
  }
}
