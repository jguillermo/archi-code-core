import tryToString from './util/tryToString';

const eth = /^(0x)[0-9a-f]{40}$/i;

export default function isEthereumAddress(str: unknown): boolean {
  const s = tryToString(str);
  if (s === false) return false;
  str = s;
  return eth.test(str);
}
