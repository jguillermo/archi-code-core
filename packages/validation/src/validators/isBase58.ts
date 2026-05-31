import coerceToString from './util/coerceToString';

// Accepted chars - 123456789ABCDEFGH JKLMN PQRSTUVWXYZabcdefghijk mnopqrstuvwxyz
const base58Reg = /^[A-HJ-NP-Za-km-z1-9]*$/;

export default function isBase58(str) {
  const s = coerceToString(str);
  if (s === false) return false;
  str = s;
  return base58Reg.test(str);
}
