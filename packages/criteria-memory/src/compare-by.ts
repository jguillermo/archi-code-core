import { compareValues } from '@archi-code/criteria';
import type { OrderNode } from '@archi-code/criteria';
import { readPath } from './read-path';

export function compareBy<T>(order: readonly OrderNode[]): (left: T, right: T) => number {
  return (left, right) => {
    for (const { field, direction } of order) {
      const result = compareValues(readPath(left, field), readPath(right, field));
      if (result !== 0) {
        return direction === 'asc' ? result : -result;
      }
    }
    return 0;
  };
}
