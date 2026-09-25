import { toString } from '../convert/string';

const md5 = /^[a-f0-9]{32}$/;

export default function isMD5(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return md5.test(str);
}
