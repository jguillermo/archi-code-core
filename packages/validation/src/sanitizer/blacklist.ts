import { assertString } from '../helpers/assertString';
import { escapeRegExp } from '../helpers/escapeRegExp';

/** Removes every character contained in `chars` (taken literally — no regex syntax). */
export function blacklist(str: string, chars: string): string {
  assertString(str);
  if (!chars) return str;
  return str.replace(new RegExp(`[${escapeRegExp(chars)}]+`, 'g'), '');
}
