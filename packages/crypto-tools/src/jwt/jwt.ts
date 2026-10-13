import type { SecurityLevel } from '../level/security-level';
import { nowInSeconds, requireText, toJson } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

export interface JwtSignOptions {
  level?: SecurityLevel;
  algorithm?: JwtAlgorithm;
  expiresIn?: number;
  issuer?: string;
  subject?: string;
  audience?: string | string[];
  requireExpiration?: boolean;
}

export interface JwtVerifyOptions {
  algorithms?: JwtAlgorithm[];
  issuer?: string;
  audience?: string;
  clockTolerance?: number;
  ignoreExpiration?: boolean;
  requireExpiration?: boolean;
}

export type JwtPayload = Record<string, unknown>;

export const jwt = {
  async sign(payload: JwtPayload, key: string, options: JwtSignOptions = {}): Promise<string> {
    const json = toJson(payload, 'payload');
    const secret = requireText(key, 'key');
    return callCrypto('jwtSign', json, secret, JSON.stringify(options), nowInSeconds());
  },

  async verify<Payload extends JwtPayload = JwtPayload>(
    signed: string,
    key: string,
    options: JwtVerifyOptions = {},
  ): Promise<Payload> {
    const text = requireText(signed, 'jwt', 'verify Error: ');
    const secret = requireText(key, 'key');
    const json = await callCrypto(
      'jwtVerify',
      text,
      secret,
      JSON.stringify(options),
      nowInSeconds(),
    );
    return JSON.parse(json) as Payload;
  },

  async decode<Payload extends JwtPayload = JwtPayload>(signed: string): Promise<Payload> {
    const text = requireText(signed, 'jwt', 'data Error: ');
    return JSON.parse(await callCrypto('jwtDecode', text)) as Payload;
  },
};
