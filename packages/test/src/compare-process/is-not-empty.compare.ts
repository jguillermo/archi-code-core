import { Compare } from './compare';

export class IsNotEmptyCompare extends Compare {
  get regexp() {
    return /^IS_NOT_EMPTY\(\)$/;
  }

  compare(value): boolean {
    return value !== '';
  }
}
