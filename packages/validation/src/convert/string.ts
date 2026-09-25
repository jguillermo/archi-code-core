import { asString } from '../core/coerce';
import { ConvertMessages, failure, success } from './result';
import type { Converted } from './result';

export function toString(v: unknown): Converted<string> {
  const s = asString(v);
  return s === undefined ? failure(ConvertMessages.STRING) : success(s);
}
