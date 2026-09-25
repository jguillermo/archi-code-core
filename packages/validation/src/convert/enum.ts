import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

/**
 * Matches a string/number/boolean against the enum options by its text form and returns the
 * matching OPTION (so `toEnum(1, ['1', '2'])` yields `'1'`, a value of the enum itself).
 */
export function toEnum<T extends string>(v: unknown, options: readonly T[]): Converted<T> {
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')
    return failure(ConvertMessages.ENUM);
  const key = String(v);
  const index = options.indexOf(key as T);
  return index === -1 ? failure(ConvertMessages.ENUM) : success(options[index]);
}
