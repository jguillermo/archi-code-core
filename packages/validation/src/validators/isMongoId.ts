import tryToString from './util/tryToString';

import isHexadecimal from './isHexadecimal';

export default function isMongoId(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return isHexadecimal(str) && str.length === 24;
}
