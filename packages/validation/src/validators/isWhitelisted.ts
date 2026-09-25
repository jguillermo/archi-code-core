import tryToString from './util/tryToString';

export default function isWhitelisted(input: unknown, chars: string | string[]): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  for (let i = str.length - 1; i >= 0; i--) {
    if (chars.indexOf(str[i]) === -1) {
      return false;
    }
  }
  return true;
}
