import { toString } from '../convert/string';

export function isLowercase(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === str.toLowerCase();
}
