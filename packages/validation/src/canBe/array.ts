import { toArray } from '../convert/array';

export function canBeArray(v: unknown): boolean {
  return toArray(v).ok;
}
