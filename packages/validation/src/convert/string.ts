import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

/**
 * Converts to string: strings as-is, booleans (`'true'`/`'false'`) and finite numbers.
 * Anything else → `{ ok: false, error: STRING }`.
 *
 * The validators use it directly as their base string coercion.
 */
export function toString(v: unknown): Converted<string> {
  if (typeof v === 'string') return success(v);
  if (typeof v === 'boolean') return success(v ? 'true' : 'false');
  if (typeof v === 'number' && Number.isFinite(v)) return success(String(v));
  return failure(ConvertMessages.STRING);
}
