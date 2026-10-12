import { toString } from '../convert/string';

const isrc = /^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$/;

export function isISRC(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return isrc.test(str);
}
