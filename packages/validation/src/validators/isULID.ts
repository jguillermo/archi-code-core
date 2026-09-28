import { toString } from '../convert/string';

export function isULID(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(str);
}
