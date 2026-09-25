import { toInteger } from '../convert/integer';

/** Safe integers (|n| ≤ Number.MAX_SAFE_INTEGER), as numbers or trimmed decimal strings. */
export function canBeInteger(v: unknown): boolean {
  return toInteger(v).ok;
}
