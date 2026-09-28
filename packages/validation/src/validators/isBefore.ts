import { toDate } from '../convert/date';
import { optionsOf } from '../helpers/config';

export interface IsBeforeOptions {
  /** Date to compare with (default: now). */
  comparisonDate?: string;
}

/**
 * Checks that `value` is strictly before `comparisonDate` (default: now). Both values are parsed with
 * `convert/date` in lax mode (`toDate(v, { lax: true })`, ported from this validator).
 */
export function isBefore(value: unknown, options?: IsBeforeOptions): boolean {
  const { comparisonDate } = optionsOf(options);
  const comparison = comparisonDate
    ? toDate(comparisonDate, { lax: true })
    : { ok: true as const, value: new Date() };
  const original = toDate(value, { lax: true });
  if (!comparison.ok || !original.ok) return false;
  return original.value < comparison.value;
}
