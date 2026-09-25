import { toString } from '../convert/string';

import { fullWidth } from './isFullWidth';
import { halfWidth } from './isHalfWidth';

export function isVariableWidth(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return fullWidth.test(str) && halfWidth.test(str);
}
