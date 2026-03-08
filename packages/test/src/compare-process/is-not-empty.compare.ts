import { Compare } from './compare';

export class IsNotEmptyCompare extends Compare {
  readonly regexp = /^IS_NOT_EMPTY\(\)$/;

  compare(value: any): boolean {
    return value !== '';
  }
}
