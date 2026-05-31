import { canBeString } from '../../primitives';

/**
 * Coerces an unknown value to string for use in validators.
 * Returns the string when coercible (string, boolean, finite number),
 * or false when the value cannot be meaningfully converted (null,
 * undefined, Symbol, BigInt, Object, Array, NaN, Infinity, etc.).
 */
export default function coerceToString(input: unknown): string | false {
  if (typeof input === 'string') return input;
  if (!canBeString(input)) return false;
  return String(input);
}
