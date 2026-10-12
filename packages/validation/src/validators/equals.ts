import { toString } from '../convert/string';
import { optionsOf } from '../helpers/config';

export interface EqualsOptions {
  comparison: string;
}

export function equals(value: unknown, options: EqualsOptions): boolean {
  const { comparison } = optionsOf(options);
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return str === comparison;
}
