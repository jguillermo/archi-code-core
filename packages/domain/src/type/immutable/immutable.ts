import { ImmutableDate } from './immutable-date';

export class Immutable {
  static freeze<T>(value: T): T {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) {
        Immutable.freeze(child);
      }
    }
    return value;
  }

  static date(date: Date): Date {
    return new ImmutableDate(date);
  }
}
