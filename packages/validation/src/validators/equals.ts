import tryToString from './util/tryToString';

export default function equals(str: unknown, comparison: string): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return str === comparison;
}
