import { afterAll, afterEach, describe, expect, it, jest } from '@jest/globals';
import type { SecurityLevel } from '../../src/level/security-level';
import { token } from '../../src/token/token';
import { workers } from '../../src/worker/workers';
import { SECRET } from '../support/fixtures';

describe('token', () => {
  afterAll(() => {
    workers.terminate();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<[SecurityLevel, string]>([
    ['basic', 'v4.local.'],
    ['standard', 'v4.local.'],
    ['strong', 'v4.local.'],
    ['cnsa', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..'],
    ['military', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..'],
  ])('encrypts a JSON payload with level %s', async (level, prefix) => {
    const encrypted = await token.encrypt({ id: 7, roles: ['user'] }, SECRET, { level });
    expect(encrypted.startsWith(prefix)).toBe(true);
    const payload = await token.decrypt<{ id: number; roles: string[]; iat: string }>(
      encrypted,
      SECRET,
    );
    expect(payload.id).toBe(7);
    expect(payload.roles).toEqual(['user']);
    expect(payload.iat).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('expires after the given seconds', async () => {
    jest.useFakeTimers({
      now: new Date('2030-01-01T00:00:00Z'),
      doNotFake: ['setTimeout', 'setImmediate', 'queueMicrotask', 'nextTick'],
    });
    const encrypted = await token.encrypt({ id: 7 }, SECRET, { expiresIn: 60 });
    expect((await token.decrypt(encrypted, SECRET)).exp).toBe('2030-01-01T00:01:00Z');
    jest.setSystemTime(new Date('2030-01-01T00:01:00Z'));
    await expect(token.decrypt(encrypted, SECRET)).rejects.toMatchObject({
      code: 'EXPIRED',
      message: 'Token expired.',
    });
  });

  it('detects tampering, wrong keys and malformed tokens', async () => {
    const key = await token.generateKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const encrypted = await token.encrypt({ id: 7 }, key);
    await expect(token.decrypt(encrypted, SECRET)).rejects.toMatchObject({ code: 'TAMPERED' });
    await expect(token.decrypt('v4.local.nope', key)).rejects.toMatchObject({ code: 'MALFORMED' });
  });

  it('rejects payloads that are not plain objects', async () => {
    await expect(token.encrypt([1] as unknown as Record<string, unknown>, SECRET)).rejects.toThrow(
      'payload must be a plain object.',
    );
    await expect(token.decrypt(1 as unknown as string, SECRET)).rejects.toThrow(
      'token must be a string.',
    );
    await expect(token.encrypt({}, SECRET, { expiresIn: -1 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
});
