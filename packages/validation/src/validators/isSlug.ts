import tryToString from './util/tryToString';

const charsetRegex = /^[a-z0-9](?!.*[-_]{2,})(?:[a-z0-9_-]*[a-z0-9])?$/;

export default function isSlug(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return charsetRegex.test(str);
}
