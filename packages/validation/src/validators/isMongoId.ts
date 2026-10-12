import { toString } from '../convert/string';

// Not isHexadecimal: it also accepts a `0x` / `0h` prefix, which an ObjectId never has.
const mongoId = /^[0-9a-fA-F]{24}$/;

export function isMongoId(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  return mongoId.test(stringResult.value);
}
