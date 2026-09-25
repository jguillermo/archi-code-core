import { toArray } from '../convert/array';

/** Arrays, or strings holding a JSON array. */
export function canBeArray(v: unknown): boolean {
  return toArray(v).ok;
}
