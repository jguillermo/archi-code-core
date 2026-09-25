import tryToString from './util/tryToString';

import { fullWidth } from './isFullWidth';
import { halfWidth } from './isHalfWidth';

export default function isVariableWidth(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return fullWidth.test(str) && halfWidth.test(str);
}
