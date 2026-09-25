import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

/** Arrays, or strings holding a JSON array. Array inputs are returned by reference. */
export function toArray(v: unknown): Converted<unknown[]> {
  if (Array.isArray(v)) return success(v);
  if (typeof v !== 'string') return failure(ConvertMessages.ARRAY);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    return failure(ConvertMessages.ARRAY);
  }
  return Array.isArray(parsed) ? success(parsed) : failure(ConvertMessages.ARRAY);
}
