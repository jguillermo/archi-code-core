import tryToString from './util/tryToString';

const surrogatePair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

export default function isSurrogatePair(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return surrogatePair.test(str);
}
