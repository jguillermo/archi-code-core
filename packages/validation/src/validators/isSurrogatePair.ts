import tryToString from './util/tryToString';

const surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

export default function isSurrogatePair(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return surrogatePair.test(str);
}
