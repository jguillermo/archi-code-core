import type { LevelOptions } from '../level/security-level';
import { requireText, toBytes } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type HashAlgorithm = 'sha256' | 'sha384' | 'sha512' | 'blake2b';

export type HmacAlgorithm = Exclude<HashAlgorithm, 'blake2b'>;

export type HashOptions = LevelOptions<HashAlgorithm>;

export type HmacOptions = LevelOptions<HmacAlgorithm>;

export const hash = {
  async digest(data: string | Uint8Array, options: HashOptions = {}): Promise<string> {
    return callCrypto('hashDigest', toBytes(data), options.level, options.algorithm);
  },

  async hmac(data: string | Uint8Array, key: string, options: HmacOptions = {}): Promise<string> {
    const bytes = toBytes(data);
    return callCrypto('hashHmac', bytes, requireText(key, 'key'), options.level, options.algorithm);
  },
};
