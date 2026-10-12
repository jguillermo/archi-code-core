import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

export interface BooleanConvertOptions {
  mode?: 'default' | 'strict' | 'loose';
}

const TRUE_VALUES = { default: ['true', '1'], strict: ['true', '1'], loose: ['true', '1', 'yes'] };
const FALSE_VALUES = {
  default: ['false', '0'],
  strict: ['false', '0'],
  loose: ['false', '0', 'no'],
};

export function toBoolean(v: unknown, options?: BooleanConvertOptions): Converted<boolean> {
  if (typeof v === 'boolean') return success(v);
  if (typeof v === 'number') {
    if (v === 1) return success(true);
    if (v === 0) return success(false);
    return failure(ConvertMessages.BOOLEAN);
  }
  if (typeof v === 'string') {
    const mode = options?.mode === 'strict' || options?.mode === 'loose' ? options.mode : 'default';
    const s = mode === 'strict' ? v : mode === 'loose' ? v.toLowerCase() : v.trim().toLowerCase();
    if (TRUE_VALUES[mode].includes(s)) return success(true);
    if (FALSE_VALUES[mode].includes(s)) return success(false);
  }
  return failure(ConvertMessages.BOOLEAN);
}
