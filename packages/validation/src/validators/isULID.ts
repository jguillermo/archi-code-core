import { toString } from '../convert/string';

export default function isULID(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(str);
}
