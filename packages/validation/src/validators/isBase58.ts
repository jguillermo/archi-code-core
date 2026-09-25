import { toString } from '../convert/string';

// Accepted chars - 123456789ABCDEFGH JKLMN PQRSTUVWXYZabcdefghijk mnopqrstuvwxyz
const base58Reg = /^[A-HJ-NP-Za-km-z1-9]*$/;

export function isBase58(input: unknown): boolean {
  const stringResult = toString(input);
  if (!stringResult.ok) return false;
  const s = stringResult.value;
  const str: string = s;
  return base58Reg.test(str);
}
