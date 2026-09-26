import { toString } from '../convert/string';
import { configText } from '../helpers/config';
import { ValidationConfigError } from '../helpers/errors';

export function matches(input: unknown, pattern: RegExp | string, modifiers?: string): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  if (Object.prototype.toString.call(pattern) === '[object RegExp]') {
    // Sticky regexes start at lastIndex: reset it so the result does not depend on earlier calls.
    (pattern as RegExp).lastIndex = 0;
    return !!str.match(pattern);
  }
  if (typeof pattern !== 'string') {
    throw new ValidationConfigError(
      `pattern must be a RegExp or a string, got ${configText(pattern)}`,
    );
  }
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, modifiers);
  } catch {
    throw new ValidationConfigError(
      `Invalid pattern '${pattern}' or modifiers '${configText(modifiers)}'`,
    );
  }
  return !!str.match(regex);
}
