import { toString } from '../convert/string';

const eth = /^(0x)[0-9a-f]{40}$/i;

export function isEthereumAddress(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return eth.test(str);
}
