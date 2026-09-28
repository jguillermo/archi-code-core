import { toString } from '../convert/string';

const hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

export function isHexadecimal(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return hexadecimal.test(str);
}
