import type { LevelOptions } from '../level/security-level';
import { requireText, toBytes } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type CipherAlgorithm =
  | 'aes-128-gcm'
  | 'aes-256-gcm'
  | 'chacha20-poly1305'
  | 'xchacha20-poly1305';

export type CipherKeyOptions = LevelOptions<CipherAlgorithm>;

export interface CipherOptions extends LevelOptions<CipherAlgorithm> {
  password?: boolean;
}

export interface CipherDecryptOptions {
  algorithm?: CipherAlgorithm;
}

export const cipher = {
  async generateKey(options: CipherKeyOptions = {}): Promise<string> {
    return callCrypto('cipherGenerateKey', options.level, options.algorithm);
  },

  async encrypt(
    data: string | Uint8Array,
    key: string,
    options: CipherOptions = {},
  ): Promise<string> {
    const bytes = toBytes(data);
    return callCrypto(
      'cipherEncrypt',
      bytes,
      requireText(key, 'key'),
      options.level,
      options.algorithm,
      options.password,
    );
  },

  async decrypt(
    encrypted: string,
    key: string,
    options: CipherDecryptOptions = {},
  ): Promise<string> {
    const text = requireText(encrypted, 'encrypted');
    return callCrypto('cipherDecrypt', text, requireText(key, 'key'), options.algorithm);
  },

  async decryptBytes(
    encrypted: string,
    key: string,
    options: CipherDecryptOptions = {},
  ): Promise<Uint8Array> {
    const text = requireText(encrypted, 'encrypted');
    return callCrypto('cipherDecryptBytes', text, requireText(key, 'key'), options.algorithm);
  },
};
