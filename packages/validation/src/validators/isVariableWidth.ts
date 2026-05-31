import coerceToString from './util/coerceToString';

import { fullWidth } from './isFullWidth';
import { halfWidth } from './isHalfWidth';

export default function isVariableWidth(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return fullWidth.test(str) && halfWidth.test(str);
}
