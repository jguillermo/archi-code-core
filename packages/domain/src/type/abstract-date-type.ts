import { AbstractType } from './abstract-type';
import { AddValidate } from '../validator/decorator/type-validator';
import { CanBeDate } from '../validator/decorator/custom/can-be-date';
import { DateValidator } from '../validator';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

@AddValidate([{ validator: CanBeDate }])
export class AbstractDateType<R extends null | undefined = undefined> extends AbstractType<Date, R> {
  protected filter(value: any): any {
    if (value === null) {
      return null;
    }
    if (!DateValidator.canBeDate(value)) {
      throw new TypePrimitiveException('Date', value);
    }
    return typeof value === 'string' ? new Date(value) : value;
  }

  get toString(): string {
    return this.value instanceof Date ? this.value.toISOString() : super.toString;
  }
}
