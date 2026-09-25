import tryToString from './util/tryToString';

export default function isLowercase(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return str === str.toLowerCase();
}
