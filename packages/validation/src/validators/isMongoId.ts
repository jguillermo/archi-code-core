import coerceToString from './util/coerceToString';

import isHexadecimal from './isHexadecimal';

export default function isMongoId(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return isHexadecimal(str) && str.length === 24;
}
