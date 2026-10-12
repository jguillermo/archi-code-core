import { toFloat } from '../convert/float';

export function canBeFloat(v: unknown): boolean {
  return toFloat(v).ok;
}
