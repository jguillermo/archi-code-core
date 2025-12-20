import { Compare } from './compare';

export class UUIDCompare extends Compare {
  get regexp() {
    return /^UUID\(\)$/;
  }

  compare(value): boolean {
    const uuidRegexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    return value.search(uuidRegexp) === 0;
  }
}
