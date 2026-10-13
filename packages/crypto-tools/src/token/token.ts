import type { LevelOptions } from '../level/security-level';
import { nowInSeconds, requireText, toJson } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type TokenAlgorithm = 'paseto-v4-local' | 'jwe-dir-a256gcm';

export interface TokenOptions extends LevelOptions<TokenAlgorithm> {
  expiresIn?: number;
  requireExpiration?: boolean;
}

export interface TokenDecryptOptions {
  requireExpiration?: boolean;
}

export type TokenPayload = Record<string, unknown>;

export const token = {
  async generateKey(): Promise<string> {
    return callCrypto('tokenGenerateKey');
  },

  async encrypt(payload: TokenPayload, key: string, options: TokenOptions = {}): Promise<string> {
    const json = toJson(payload, 'payload');
    const { level, algorithm, expiresIn, requireExpiration } = options;
    const secret = requireText(key, 'key');
    return callCrypto(
      'tokenEncrypt',
      json,
      secret,
      level,
      algorithm,
      nowInSeconds(),
      expiresIn,
      requireExpiration,
    );
  },

  async decrypt<Payload extends TokenPayload = TokenPayload>(
    encrypted: string,
    key: string,
    options: TokenDecryptOptions = {},
  ): Promise<Payload> {
    const text = requireText(encrypted, 'token');
    const secret = requireText(key, 'key');
    const { requireExpiration } = options;
    const json = await callCrypto('tokenDecrypt', text, secret, nowInSeconds(), requireExpiration);
    return JSON.parse(json) as Payload;
  },
};
