import { assertString } from '../validators/util/assertString';
import { escapeRegExp } from '../validators/util/escapeRegExp';

/** Keeps only the characters contained in `chars` (taken literally — no regex syntax). */
export function whitelist(str: string, chars: string): string {
  assertString(str);
  if (!chars) return '';
  return str.replace(new RegExp(`[^${escapeRegExp(chars)}]+`, 'g'), '');
}
