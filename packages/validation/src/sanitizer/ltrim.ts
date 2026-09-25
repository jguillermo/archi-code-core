import { assertString } from '../validators/util/assertString';
import { escapeRegExp } from '../validators/util/escapeRegExp';

export function ltrim(str: string, chars?: string): string {
  assertString(str);
  const pattern = chars ? new RegExp(`^[${escapeRegExp(chars)}]+`, 'g') : /^\s+/g;
  return str.replace(pattern, '');
}
