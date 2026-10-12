import { toDate } from '../convert/date';
import { optionsOf } from '../helpers/config';

export interface IsAfterOptions {
  comparisonDate?: string;
}

export function isAfter(value: unknown, options?: IsAfterOptions): boolean {
  const { comparisonDate } = optionsOf(options);
  const comparison = comparisonDate
    ? toDate(comparisonDate, { lax: true })
    : { ok: true as const, value: new Date() };
  const original = toDate(value, { lax: true });
  if (!comparison.ok || !original.ok) return false;
  return original.value > comparison.value;
}
