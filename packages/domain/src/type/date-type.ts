import { toDate } from '@archi-code/validation';
import { AbstractType, Required } from './abstract-type';
import { TypePrimitiveException } from '../exceptions/domain/type-primitive.exception';

export class DateType extends AbstractType<Date> {
  protected filter(value: unknown): Date {
    const converted = toDate(value, { iso: true });
    if (!converted.ok) {
      throw new TypePrimitiveException('Date', value);
    }
    return converted.value;
  }

  get toString(): string {
    return this._value === null ? '' : this._value.toISOString();
  }
}

export class CreatedAt extends Required(DateType) {
  static now(): CreatedAt {
    return new CreatedAt(new Date());
  }
}

export class UpdatedAt extends Required(DateType) {
  static now(): UpdatedAt {
    return new UpdatedAt(new Date());
  }

  setNow(): void {
    this._value = new Date();
  }
}
