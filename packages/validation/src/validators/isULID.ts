import tryToString from './util/tryToString';

export default function isULID(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(str);
}
