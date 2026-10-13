import type { LevelOptions } from '../level/security-level';
import { nowInSeconds, requireObject, requireText } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type TokenAlgorithm = 'paseto-v4-local' | 'jwe-dir-a256gcm';

export interface TokenOptions extends LevelOptions<TokenAlgorithm> {
  expiresIn?: number;
}

export type TokenPayload = Record<string, unknown>;

export const token = {
  async generateKey(): Promise<string> {
    return callCrypto('tokenGenerateKey');
  },

  async encrypt(payload: TokenPayload, key: string, options: TokenOptions = {}): Promise<string> {
    const json = JSON.stringify(requireObject(payload, 'payload'));
    const { level, algorithm, expiresIn } = options;
    const secret = requireText(key, 'key');
    return callCrypto('tokenEncrypt', json, secret, level, algorithm, nowInSeconds(), expiresIn);
  },

  async decrypt<Payload extends TokenPayload = TokenPayload>(
    encrypted: string,
    key: string,
  ): Promise<Payload> {
    const text = requireText(encrypted, 'token');
    const json = await callCrypto('tokenDecrypt', text, requireText(key, 'key'), nowInSeconds());
    return JSON.parse(json) as Payload;
  },
};
