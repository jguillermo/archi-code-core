import tryToString from './util/tryToString';

const eth = /^(0x)[0-9a-f]{40}$/i;

export default function isEthereumAddress(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  return eth.test(str);
}
