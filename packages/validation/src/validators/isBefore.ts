import { toDate } from '../convert/date';

/**
 * Checks that `date` is strictly before `comparisonDate` (default: now). Both values are parsed with
 * `convert/date` in lax mode (`toDate(v, { lax: true })`, ported from this validator).
 */
export default function isBefore(
  date: unknown,
  options?: string | { comparisonDate?: string },
): boolean {
  // For backwards compatibility:
  // isBefore(str [, date]), i.e. `options` could be used as argument for the legacy `date`
  const comparisonDate = typeof options === 'object' ? options?.comparisonDate : options;
  const comparison = comparisonDate
    ? toDate(comparisonDate, { lax: true })
    : { ok: true as const, value: new Date() };
  const original = toDate(date, { lax: true });
  if (!comparison.ok || !original.ok) return false;
  return original.value < comparison.value;
}
