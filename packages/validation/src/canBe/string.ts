import { toString } from '../convert/string';

export function canBeString(v: unknown): boolean {
  return toString(v).ok;
}
