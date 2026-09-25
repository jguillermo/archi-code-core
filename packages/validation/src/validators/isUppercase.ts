import tryToString from './util/tryToString';

export default function isUppercase(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return str === str.toUpperCase();
}
