import { toDate } from '@archi-code/validation';
import { AbstractType } from './abstract-type';
import { Required } from './required/required-type';
import { TypePrimitiveException } from '../../exceptions/index';

class ImmutableDate extends Date {
  private static readonly setters = [
    'setDate',
    'setFullYear',
    'setHours',
    'setMilliseconds',
    'setMinutes',
    'setMonth',
    'setSeconds',
    'setTime',
    'setUTCDate',
    'setUTCFullYear',
    'setUTCHours',
    'setUTCMilliseconds',
    'setUTCMinutes',
    'setUTCMonth',
    'setUTCSeconds',
    'setYear',
  ];

  static {
    for (const setter of ImmutableDate.setters) {
      Object.defineProperty(ImmutableDate.prototype, setter, {
        value(): never {
          throw new TypeError(`Cannot call ${setter}: the date is immutable`);
        },
      });
    }
  }

  constructor(date: Date) {
    super(date.getTime());
    Object.freeze(this);
  }
}

const TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export class DateType extends AbstractType<Date, Date | string> {
  protected filter(value: unknown): Date {
    const converted = toDate(value, { iso: true });
    if (!converted.ok || (typeof value === 'string' && TIME_WITHOUT_ZONE.test(value))) {
      throw new TypePrimitiveException('Date', value);
    }
    return new ImmutableDate(converted.value);
  }

  toString(): string {
    return this._value === null ? '' : this._value.toISOString();
  }

  protected hasSameValue(other: this): boolean {
    return this._value?.getTime() === other._value?.getTime();
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
