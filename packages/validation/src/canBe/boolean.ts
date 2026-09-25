import { toBoolean } from '../convert/boolean';

/** Booleans, `0`/`1`, and the strings `'true'`/`'false'`/`'1'`/`'0'` (trimmed, case-insensitive). */
export function canBeBoolean(v: unknown): boolean {
  return toBoolean(v).ok;
}
