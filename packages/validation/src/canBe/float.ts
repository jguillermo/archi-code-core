import { toFloat } from '../convert/float';

/** Finite numbers, or trimmed strings in plain decimal notation (no hex/binary/octal literals). */
export function canBeFloat(v: unknown): boolean {
  return toFloat(v).ok;
}
