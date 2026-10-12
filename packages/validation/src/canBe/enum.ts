import { toEnum } from '../convert/enum';

export function canBeEnum(v: unknown, options: readonly string[]): boolean {
  return toEnum(v, options).ok;
}
