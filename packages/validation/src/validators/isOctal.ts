import tryToString from './util/tryToString';

const octal = /^(0o)?[0-7]+$/i;

export default function isOctal(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return octal.test(str);
}
