import tryToString from './util/tryToString';

// see http://isrc.ifpi.org/en/isrc-standard/code-syntax
const isrc = /^[A-Z]{2}[0-9A-Z]{3}\d{2}\d{5}$/;

export default function isISRC(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return isrc.test(str);
}
