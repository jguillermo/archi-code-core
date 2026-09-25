import { toString } from '../convert/string';

export default function equals(input: unknown, comparison: string): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === comparison;
}
