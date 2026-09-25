import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

export function toBoolean(v: unknown): Converted<boolean> {
  if (typeof v === 'boolean') return success(v);
  if (typeof v === 'number') {
    if (v === 1) return success(true);
    if (v === 0) return success(false);
    return failure(ConvertMessages.BOOLEAN);
  }
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return success(true);
    if (s === 'false' || s === '0') return success(false);
  }
  return failure(ConvertMessages.BOOLEAN);
}
