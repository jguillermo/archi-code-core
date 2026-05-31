import tryToString from './util/tryToString';

import isHexadecimal from './isHexadecimal';

export default function isMongoId(str) {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return isHexadecimal(str) && str.length === 24;
}
