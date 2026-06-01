import tryToString from './util/tryToString';

export default function isWhitelisted(str: unknown, chars: string | string[]): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  for (let i = str.length - 1; i >= 0; i--) {
    if (chars.indexOf(str[i]) === -1) {
      return false;
    }
  }
  return true;
}
