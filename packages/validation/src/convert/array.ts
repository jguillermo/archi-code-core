import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

export function toArray(v: unknown): Converted<unknown[]> {
  let isArray: boolean;
  try {
    isArray = Array.isArray(v);
  } catch {
    // A revoked proxy makes even Array.isArray throw.
    return failure(ConvertMessages.ARRAY);
  }
  if (isArray) return success(v as unknown[]);
  if (typeof v !== 'string') return failure(ConvertMessages.ARRAY);
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    return failure(ConvertMessages.ARRAY);
  }
  return Array.isArray(parsed) ? success(parsed) : failure(ConvertMessages.ARRAY);
}
