import { afterAll, describe, expect, it } from 'vitest';
import { securityLevels } from '../../src/level/security-levels';
import { workers } from '../../src/worker/workers';

describe('securityLevels', () => {
  afterAll(() => {
    workers.terminate();
  });

  it('describes what every level uses', async () => {
    const levels = await securityLevels();
    expect(Object.keys(levels).sort()).toEqual(['basic', 'cnsa', 'standard', 'strong']);
    expect(levels.basic).toEqual({
      cipher: 'aes-128-gcm',
      token: 'paseto-v4-local',
      hash: 'sha256',
      password: { algorithm: 'bcrypt', cost: 10 },
      rsa: { bits: 2048, encryption: 'RSA-OAEP-256', signature: 'PS256' },
      jwt: { secret: 'HS256', pem: 'RS256' },
    });
    expect(levels.standard.password).toEqual({
      algorithm: 'argon2id',
      memoryKiB: 65536,
      iterations: 3,
      parallelism: 4,
    });
    expect(levels.cnsa.cipher).toBe('aes-256-gcm');
    expect(levels.cnsa.token).toBe('jwe-dir-a256gcm');
    expect(levels.strong.cipher).toBe('xchacha20-poly1305');
  });
});
