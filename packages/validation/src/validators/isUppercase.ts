import { toString } from '../convert/string';

export default function isUppercase(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === str.toUpperCase();
}
