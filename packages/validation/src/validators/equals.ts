import tryToString from './util/tryToString';

export default function equals(input: unknown, comparison: string): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return str === comparison;
}
