import { toDate } from '../convert/date';

export function canBeDate(v: unknown): boolean {
  return toDate(v).ok;
}
