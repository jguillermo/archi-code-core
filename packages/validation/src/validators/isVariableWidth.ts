import tryToString from './util/tryToString';

import { fullWidth } from './isFullWidth';
import { halfWidth } from './isHalfWidth';

export default function isVariableWidth(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return fullWidth.test(str) && halfWidth.test(str);
}
