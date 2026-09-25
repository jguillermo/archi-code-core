import { toString } from '../convert/string';

const octal = /^(0o)?[0-7]+$/i;

export default function isOctal(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return octal.test(str);
}
