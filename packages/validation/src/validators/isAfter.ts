import parseDateLax from './util/parseDateLax';

/**
 * Checks that `date` is strictly after `comparisonDate` (default: now).
 * Both values are parsed deterministically — see `util/parseDateLax` for the accepted formats.
 */
export default function isAfter(
  date: unknown,
  options?: string | { comparisonDate?: string },
): boolean {
  // For backwards compatibility:
  // isAfter(str [, date]), i.e. `options` could be used as argument for the legacy `date`
  const comparisonDate = typeof options === 'object' ? options?.comparisonDate : options;
  const comparison = comparisonDate ? parseDateLax(comparisonDate) : new Date();
  const original = parseDateLax(date);
  if (comparison === undefined || original === undefined) return false;
  return original > comparison;
}
