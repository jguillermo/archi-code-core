import { toString } from '../convert/string';

const hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

export function isHexadecimal(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return hexadecimal.test(str);
}
