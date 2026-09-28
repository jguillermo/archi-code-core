import { toString } from '../convert/string';

export function isUppercase(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === str.toUpperCase();
}
