import { toString } from '../convert/string';

import isHexadecimal from './isHexadecimal';

export default function isMongoId(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return isHexadecimal(str) && str.length === 24;
}
