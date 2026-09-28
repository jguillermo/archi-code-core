import { toString } from '../convert/string';

export function isLowercase(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === str.toLowerCase();
}
