import tryToString from './util/tryToString';

export default function matches(
  input: unknown,
  pattern: RegExp | string,
  modifiers?: string,
): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
    pattern = new RegExp(pattern, modifiers);
  }
  return !!str.match(pattern);
}
