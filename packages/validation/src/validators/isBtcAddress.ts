import { toString } from '../convert/string';

const bech32 = /^(bc1|tb1|bc1p|tb1p)[ac-hj-np-z02-9]{39,58}$/;
const base58 = /^(1|2|3|m)[A-HJ-NP-Za-km-z1-9]{25,39}$/;

export function isBtcAddress(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return bech32.test(str) || base58.test(str);
}
