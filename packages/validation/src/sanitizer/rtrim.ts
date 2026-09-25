import { assertString } from '../validators/util/assertString';
import { escapeRegExp } from '../validators/util/escapeRegExp';

export function rtrim(str: string, chars?: string): string {
  assertString(str);
  if (chars) {
    return str.replace(new RegExp(`[${escapeRegExp(chars)}]+$`, 'g'), '');
  }
  let i = str.length - 1;
  while (/\s/.test(str.charAt(i))) i--;
  return str.slice(0, i + 1);
}
