import { afterAll, describe, expect, it } from 'vitest';
import { hash } from '../../src/hash/hash';
import type { SecurityLevel } from '../../src/level/security-level';
import { workers } from '../../src/worker/workers';

describe('hash', () => {
  afterAll(() => {
    workers.terminate();
  });

  it('digests with known vectors', async () => {
    expect(await hash.digest('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await hash.digest(new Uint8Array([97, 98, 99]), { algorithm: 'blake2b' })).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it.each<[SecurityLevel, number]>([
    ['basic', 64],
    ['standard', 64],
    ['strong', 96],
    ['cnsa', 128],
    ['military', 128],
  ])('uses the digest of level %s', async (level, length) => {
    expect(await hash.digest('text', { level })).toHaveLength(length);
  });

  it('is deterministic', async () => {
    expect(await hash.digest('text')).toBe(await hash.digest('text'));
    expect(await hash.digest('text')).not.toBe(await hash.digest('other'));
  });

  it('computes HMAC with the RFC 4231 vector', async () => {
    expect(await hash.hmac('what do ya want for nothing?', 'Jefe')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    expect(await hash.hmac('x', 'key', { level: 'cnsa' })).toHaveLength(128);
  });

  it('rejects invalid input', async () => {
    await expect(hash.digest('x', { algorithm: 'md5' as 'sha256' })).rejects.toMatchObject({
      code: 'UNSUPPORTED',
    });
    await expect(hash.hmac('x', '')).rejects.toMatchObject({ code: 'INVALID_KEY' });
    await expect(hash.hmac('x', 1 as unknown as string)).rejects.toThrow('key must be a string.');
  });
});
