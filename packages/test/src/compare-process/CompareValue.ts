import { Compare } from './compare';
import { UUIDCompare } from './UUIDCompare';
import { IsNotEmptyCompare } from './is-not-empty.compare';
import { IsTimeCompare } from './is-time.compare';

export class CompareValue {
  private static instance: CompareValue;
  private typeCompare: Compare[];

  private constructor() {
    this.typeCompare = [new UUIDCompare(), new IsNotEmptyCompare(), new IsTimeCompare()];
  }

  public static getInstance(): CompareValue {
    if (!CompareValue.instance) {
      CompareValue.instance = new CompareValue();
    }
    return CompareValue.instance;
  }

  public compare(data: any, reference: any): boolean {
    if (data === reference) {
      return true;
    }
    let isCustom = false;
    let compare = false;
    for (const compareValues of this.typeCompare) {
      if (typeof data === 'string' || data instanceof String) {
        if (data.search(compareValues.regexp) === 0) {
          isCustom = true;
          compare = compareValues.compare(reference);
        }
      }
    }
    return isCustom ? compare : data === reference;
  }
}
