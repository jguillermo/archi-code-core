import tryToString from './util/tryToString';

export default function isULID(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(str);
}
