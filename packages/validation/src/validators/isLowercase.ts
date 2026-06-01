import tryToString from './util/tryToString';

export default function isLowercase(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return str === str.toLowerCase();
}
