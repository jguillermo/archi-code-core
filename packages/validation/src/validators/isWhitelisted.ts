import { toString } from '../convert/string';
import { configText } from './util/config';
import { ValidationConfigError } from './util/errors';

export function isWhitelisted(input: unknown, chars: string | string[]): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  if (typeof chars !== 'string' && !Array.isArray(chars)) {
    throw new ValidationConfigError(`chars must be a string or an array, got ${configText(chars)}`);
  }
  for (let i = str.length - 1; i >= 0; i--) {
    if (chars.indexOf(str[i]) === -1) {
      return false;
    }
  }
  return true;
}
