import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

export interface BooleanConvertOptions {
  /**
   * - `'default'`: trimmed, case-insensitive `'true'`/`'1'` → true, `'false'`/`'0'` → false.
   * - `'strict'` / `'loose'`: rules PORTED FROM `validator.isBoolean`. They were moved here so the
   *   validator no longer duplicates the boolean rule, but they are NOT compatible with the
   *   default: `'strict'` is case-sensitive and does not trim (`'TRUE'`, `' true'` fail);
   *   `'loose'` lower-cases without trimming and also accepts `'yes'`/`'no'`.
   */
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
    // Unknown modes fall back to 'default' (converters never throw).
    const mode = options?.mode === 'strict' || options?.mode === 'loose' ? options.mode : 'default';
    const s = mode === 'strict' ? v : mode === 'loose' ? v.toLowerCase() : v.trim().toLowerCase();
    if (TRUE_VALUES[mode].includes(s)) return success(true);
    if (FALSE_VALUES[mode].includes(s)) return success(false);
  }
  return failure(ConvertMessages.BOOLEAN);
}
