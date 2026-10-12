import { toInteger } from '../convert/integer';

export function canBeInteger(v: unknown): boolean {
  return toInteger(v).ok;
}
