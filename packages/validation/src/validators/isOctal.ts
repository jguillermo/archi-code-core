import { toString } from '../convert/string';

const octal = /^(0o)?[0-7]+$/i;

export function isOctal(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return octal.test(str);
}
