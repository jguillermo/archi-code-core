import tryToString from './util/tryToString';

const hexadecimal = /^(0x|0h)?[0-9A-F]+$/i;

export default function isHexadecimal(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return hexadecimal.test(str);
}
