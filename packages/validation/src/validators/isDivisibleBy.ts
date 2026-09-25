import { toString } from '../convert/string';
import { toFloat } from '../convert/float';

export function isDivisibleBy(str: unknown, num: number): boolean {
  const stringResult = toString(str);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  // Float reading is the rule of convert (same syntax as isFloat).
  const r = toFloat(s, { syntax: 'validator' });
  return r.ok && r.value % parseInt(String(num), 10) === 0;
}
