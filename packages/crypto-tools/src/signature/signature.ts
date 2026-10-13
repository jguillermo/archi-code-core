import type { LevelOptions } from '../level/security-level';
import { requireText, toBytes } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type SignatureAlgorithm = 'PS256' | 'PS384' | 'PS512';

export type SignatureOptions = LevelOptions<SignatureAlgorithm>;

export const signature = {
  async sign(
    data: string | Uint8Array,
    privateKey: string,
    options: SignatureOptions = {},
  ): Promise<string> {
    const bytes = toBytes(data);
    const key = requireText(privateKey, 'privateKey');
    return callCrypto('signatureSign', bytes, key, options.level, options.algorithm);
  },

  async verify(data: string | Uint8Array, signed: string, publicKey: string): Promise<boolean> {
    const bytes = toBytes(data);
    const text = requireText(signed, 'signature');
    return callCrypto('signatureVerify', bytes, text, requireText(publicKey, 'publicKey'));
  },
};
