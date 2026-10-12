import { toString } from '../convert/string';
import { toFloat } from '../convert/float';
import { optionsOf } from '../helpers/config';

export interface IsDivisibleByOptions {
  num: number;
}

export function isDivisibleBy(value: unknown, options: IsDivisibleByOptions): boolean {
  const { num } = optionsOf(options);
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const r = toFloat(s, { syntax: 'validator' });
  return r.ok && r.value % parseInt(String(num), 10) === 0;
}
