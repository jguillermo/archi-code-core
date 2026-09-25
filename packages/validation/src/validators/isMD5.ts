import tryToString from './util/tryToString';

const md5 = /^[a-f0-9]{32}$/;

export default function isMD5(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return md5.test(str);
}
