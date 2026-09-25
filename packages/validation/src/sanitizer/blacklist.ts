import { assertString } from '../validators/util/assertString';
import { escapeRegExp } from '../validators/util/escapeRegExp';

/** Removes every character contained in `chars` (taken literally — no regex syntax). */
export function blacklist(str: string, chars: string): string {
  assertString(str);
  if (!chars) return str;
  return str.replace(new RegExp(`[${escapeRegExp(chars)}]+`, 'g'), '');
}
