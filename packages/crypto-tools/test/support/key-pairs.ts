import { rsa } from '../../src/rsa/rsa';
import type { RsaKeyPair } from '../../src/rsa/rsa';

let basic: Promise<RsaKeyPair> | undefined;
let cnsa: Promise<RsaKeyPair> | undefined;

export function basicKeyPair(): Promise<RsaKeyPair> {
  basic ??= rsa.generateKeyPair({ level: 'basic' });
  return basic;
}

export function cnsaKeyPair(): Promise<RsaKeyPair> {
  cnsa ??= rsa.generateKeyPair({ level: 'cnsa' });
  return cnsa;
}
