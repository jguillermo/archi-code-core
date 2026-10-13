import type { LevelOptions, PasswordParams } from '../level/security-level';
import { requireText } from '../wasm/input';
import { callCrypto } from '../worker/workers';

export type PasswordAlgorithm = 'bcrypt' | 'argon2id';

export interface PasswordOptions extends LevelOptions<PasswordAlgorithm> {
  cost?: number;
}

export const password = {
  async hash(plain: string, options: PasswordOptions = {}): Promise<string> {
    const { level, algorithm, cost } = options;
    return callCrypto('passwordHash', requireText(plain, 'password'), level, algorithm, cost);
  },

  async verify(plain: string, hash: string): Promise<boolean> {
    return callCrypto('passwordVerify', requireText(plain, 'password'), requireText(hash, 'hash'));
  },

  async isHash(value: string): Promise<boolean> {
    return callCrypto('passwordIsHash', requireText(value, 'value'));
  },

  async params(options: PasswordOptions = {}): Promise<PasswordParams> {
    const { level, algorithm, cost } = options;
    return JSON.parse(await callCrypto('passwordParams', level, algorithm, cost)) as PasswordParams;
  },
};
