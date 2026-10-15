import { CriteriaError } from './criteria-error';
import { isRecord } from './criteria-value';
import { OrderNode, SortDirection } from './order';

export function normalizeOrderBy(orderBy: unknown): OrderNode[] {
  const items: unknown[] = Array.isArray(orderBy) ? orderBy : [orderBy];
  return items.flatMap((item) => {
    if (!isRecord(item)) {
      throw new CriteriaError('INVALID_ORDER', '"orderBy" needs objects like { field: "asc" }');
    }
    return Object.entries(item)
      .filter(([, direction]) => direction !== undefined)
      .map(([field, direction]) => ({ field, direction: direction as SortDirection }));
  });
}
