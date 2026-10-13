import { afterAll, describe, expect, it } from '@jest/globals';
import * as api from '../src/index';

const PUBLIC_API = [
  'CRYPTO_ERROR_CODES',
  'CryptoEngine',
  'CryptoError',
  'SECURITY_LEVEL_NAMES',
  'cipher',
  'hash',
  'jwt',
  'password',
  'rsa',
  'securityLevels',
  'signature',
  'token',
  'workers',
];

describe('@archi-code/crypto-tools', () => {
  afterAll(() => {
    api.workers.terminate();
  });

  it('exports exactly the public API', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_API);
  });

  it('exposes the standard verbs of every tool', () => {
    expect(Object.keys(api.password)).toEqual(['hash', 'verify', 'isHash', 'params']);
    expect(Object.keys(api.cipher)).toEqual(['generateKey', 'encrypt', 'decrypt', 'decryptBytes']);
    expect(Object.keys(api.rsa)).toEqual(['generateKeyPair', 'encrypt', 'decrypt', 'decryptBytes']);
    expect(Object.keys(api.signature)).toEqual(['sign', 'verify']);
    expect(Object.keys(api.hash)).toEqual(['digest', 'hmac']);
    expect(Object.keys(api.token)).toEqual(['generateKey', 'encrypt', 'decrypt']);
    expect(Object.keys(api.jwt)).toEqual(['sign', 'verify', 'decode']);
    expect(Object.keys(api.workers)).toEqual(['configure', 'terminate', 'runtime']);
  });
});
