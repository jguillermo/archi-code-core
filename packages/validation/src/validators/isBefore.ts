import { toDateLax } from '../convert';

export default function isBefore(
  date: unknown,
  options?: string | { comparisonDate?: string },
): boolean {
  // For backwards compatibility:
  // isBefore(str [, date]), i.e. `options` could be used as argument for the legacy `date`
  const comparisonDate =
    (typeof options === 'object' ? options.comparisonDate : options) || new Date().toISOString();
  try {
    const comparison = toDateLax(comparisonDate);
    const original = toDateLax(date);
    return original < comparison;
  } catch {
    return false;
  }
}
