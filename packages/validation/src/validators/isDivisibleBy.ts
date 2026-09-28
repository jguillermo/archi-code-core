import { toString } from '../convert/string';
import { toFloat } from '../convert/float';
import { optionsOf } from '../helpers/config';

export interface IsDivisibleByOptions {
  /** Divisor (read as an integer). */
  num: number;
}

export function isDivisibleBy(value: unknown, options: IsDivisibleByOptions): boolean {
  const { num } = optionsOf(options);
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  // Float reading is the rule of convert (same syntax as isFloat).
  const r = toFloat(s, { syntax: 'validator' });
  return r.ok && r.value % parseInt(String(num), 10) === 0;
}
