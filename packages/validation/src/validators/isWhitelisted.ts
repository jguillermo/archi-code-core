import { toString } from '../convert/string';
import { configText, optionsOf } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';

export interface IsWhitelistedOptions {
  /** Allowed characters. */
  chars: string | string[];
}

export function isWhitelisted(value: unknown, options: IsWhitelistedOptions): boolean {
  const { chars } = optionsOf(options);
  const stringResult = toString(value);
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
