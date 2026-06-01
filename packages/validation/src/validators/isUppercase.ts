import tryToString from './util/tryToString';

export default function isUppercase(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return str === str.toUpperCase();
}
