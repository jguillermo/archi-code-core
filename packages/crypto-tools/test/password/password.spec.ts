import { afterAll, describe, expect, it } from '@jest/globals';
import { password } from '../../src/password/password';
import { workers } from '../../src/worker/workers';
import { fixtures } from '../support/fixtures';

const BCRYPT = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

describe('password', () => {
  afterAll(() => {
    workers.terminate();
  });

  it('hashes with bcrypt by default and verifies', async () => {
    const hash = await password.hash('SecurePassword123!', { cost: 4 });
    expect(hash).toMatch(BCRYPT);
    expect(await password.verify('SecurePassword123!', hash)).toBe(true);
    expect(await password.verify('WrongPassword!', hash)).toBe(false);
  });

  it('uses the algorithm of each level', async () => {
    expect((await password.hash('secret', { level: 'basic' })).startsWith('$2b$10$')).toBe(true);
    const strong = await password.hash('secret', { level: 'strong' });
    expect(strong.startsWith('$argon2id$v=19$m=65536,t=3,p=4$')).toBe(true);
    expect(await password.verify('secret', strong)).toBe(true);
  });

  it('produces a different hash every time', async () => {
    const first = await password.hash('secret', { cost: 4 });
    const second = await password.hash('secret', { cost: 4 });
    expect(first).not.toBe(second);
  });

  it('describes the parameters of each level without hashing', async () => {
    expect(await password.params()).toEqual({ algorithm: 'bcrypt', cost: 12 });
    expect(await password.params({ level: 'military' })).toEqual({
      algorithm: 'argon2id',
      memoryKiB: 262144,
      iterations: 4,
      parallelism: 4,
    });
    expect(await password.params({ algorithm: 'bcrypt', cost: 31 })).toEqual({
      algorithm: 'bcrypt',
      cost: 31,
    });
  });

  it('verifies hashes created by the previous bcrypt and libsodium implementation', async () => {
    for (const name of ['bcrypt', 'argon2id'] as const) {
      const { password: plain, hash } = fixtures.password[name];
      expect(await password.verify(plain, hash)).toBe(true);
      expect(await password.verify('WrongPassword!', hash)).toBe(false);
    }
  });

  it('recognises password hashes', async () => {
    expect(
      await password.isHash('$2b$12$D5.xYyM96cGfD.g8O6jMkOt3kFKQoBJDdq9BdqjVwp3Xkrxjl5Nuq'),
    ).toBe(true);
    expect(await password.isHash(fixtures.password.argon2id.hash)).toBe(true);
    for (const value of ['', '$2b$malformedhash', 'sha256$abcdef1234567890']) {
      expect(await password.isHash(value)).toBe(false);
      expect(await password.verify('SecurePassword123!', value)).toBe(false);
    }
  });

  it('rejects invalid options and input', async () => {
    for (const cost of [3, 32]) {
      await expect(password.hash('secret', { cost })).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        message: 'Cost must be between 4 and 31.',
      });
    }
    await expect(
      password.hash('secret', { level: 'basic', algorithm: 'argon2id' }),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED',
    });
    await expect(password.hash(42 as unknown as string)).rejects.toThrow(
      'password must be a string.',
    );
  });
});
