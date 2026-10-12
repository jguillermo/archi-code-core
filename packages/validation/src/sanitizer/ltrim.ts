import { assertString } from '../helpers/assertString';
import { escapeRegExp } from '../helpers/escapeRegExp';

const hasNativeTrimStart = typeof String.prototype.trimStart === 'function';

export function ltrim(str: string, chars?: string): string {
  assertString(str);
  if (chars) {
    return str.replace(new RegExp(`^[${escapeRegExp(chars)}]+`), '');
  }
  return hasNativeTrimStart ? str.trimStart() : str.replace(/^\s+/, '');
}
