import { Compare } from './compare';

export class IsTimeCompare extends Compare {
  get regexp() {
    return /^IS_TIME\(\)$/;
  }

  compare(value): boolean {
    const timeRegexp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return value.search(timeRegexp) === 0;
  }
}
