import type { LevelOptions, SecurityLevel } from '../level/security-level';
import { requireText, toBytes } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type RsaAlgorithm = 'RSA-OAEP-256' | 'RSA-OAEP-384' | 'RSA-OAEP-512';

export type RsaBits = 2048 | 3072 | 4096;

export interface RsaKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface RsaKeyPairOptions {
  level?: SecurityLevel;
  bits?: RsaBits;
}

export type RsaOptions = LevelOptions<RsaAlgorithm>;

export const rsa = {
  async generateKeyPair(options: RsaKeyPairOptions = {}): Promise<RsaKeyPair> {
    return JSON.parse(
      await callCrypto('rsaGenerateKeyPair', options.level, options.bits),
    ) as RsaKeyPair;
  },

  async encrypt(
    data: string | Uint8Array,
    publicKey: string,
    options: RsaOptions = {},
  ): Promise<string> {
    const bytes = toBytes(data);
    const key = requireText(publicKey, 'publicKey');
    return callCrypto('rsaEncrypt', bytes, key, options.level, options.algorithm);
  },

  async decrypt(encrypted: string, privateKey: string): Promise<string> {
    const text = requireText(encrypted, 'encrypted');
    return callCrypto('rsaDecrypt', text, requireText(privateKey, 'privateKey'));
  },

  async decryptBytes(encrypted: string, privateKey: string): Promise<Uint8Array> {
    const text = requireText(encrypted, 'encrypted');
    return callCrypto('rsaDecryptBytes', text, requireText(privateKey, 'privateKey'));
  },
};
