import { toEnum } from '../convert/enum';

/** Strings, numbers or booleans whose text form is one of `options`. */
export function canBeEnum(v: unknown, options: readonly string[]): boolean {
  return toEnum(v, options).ok;
}
