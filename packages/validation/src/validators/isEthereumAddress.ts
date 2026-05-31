import coerceToString from './util/coerceToString';

const eth = /^(0x)[0-9a-f]{40}$/i;

export default function isEthereumAddress(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return eth.test(str);
}
