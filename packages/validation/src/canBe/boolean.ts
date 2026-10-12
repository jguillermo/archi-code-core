import { toBoolean } from '../convert/boolean';

export function canBeBoolean(v: unknown): boolean {
  return toBoolean(v).ok;
}
