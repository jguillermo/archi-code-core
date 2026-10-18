import { toDate } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { Immutable } from './immutable/immutable';
import { Required } from './required/required';
import { TypePrimitiveException } from '../../exceptions/index';

const TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export class DateType extends AbstractType<Date> {
  protected filter(value: unknown): Date {
    const converted = toDate(value, { iso: true });
    if (!converted.ok || (typeof value === 'string' && TIME_WITHOUT_ZONE.test(value))) {
      throw new TypePrimitiveException('Date', value);
    }
    return Immutable.date(converted.value);
  }

  toString(): string {
    return this._value === null ? '' : this._value.toISOString();
  }
}

const SYSTEM_TIME = { now: (): Date => new Date() };

export class CreatedAt extends Required(DateType) {
  static now(clock: { now(): Date } = SYSTEM_TIME): CreatedAt {
    return new CreatedAt(clock.now());
  }
}

export class UpdatedAt extends Required(DateType) {
  static now(clock: { now(): Date } = SYSTEM_TIME): UpdatedAt {
    return new UpdatedAt(clock.now());
  }
}
