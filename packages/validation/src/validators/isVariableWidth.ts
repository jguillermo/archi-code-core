import { toString } from '../convert/string';

import { fullWidth } from './isFullWidth';
import { halfWidth } from './isHalfWidth';

export function isVariableWidth(value: unknown): boolean {
  const stringResult = toString(value);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return fullWidth.test(str) && halfWidth.test(str);
}
