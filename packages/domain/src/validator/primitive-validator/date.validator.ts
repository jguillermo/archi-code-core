import { isDateString } from 'class-validator';

export class DateValidator {
  static canBeDate(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    const isValidDate = value instanceof Date && !isNaN(value.getTime());
    if (isValidDate) {
      return true;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return isDateString(value);
    }
    return false;
  }
}
