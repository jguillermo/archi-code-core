import { toDateLax } from '../convert';

export default function isAfter(date?, options?) {
  // For backwards compatibility:
  // isAfter(str [, date]), i.e. `options` could be used as argument for the legacy `date`
  const comparisonDate =
    (typeof options === 'object' ? options.comparisonDate : options) || new Date().toISOString();
  try {
    const comparison = toDateLax(comparisonDate);
    const original = toDateLax(date);
    return original > comparison;
  } catch {
    return false;
  }
}
