import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { jwt } from '../../src/jwt/jwt';
import { workers } from '../../src/worker/workers';
import { basicKeyPair } from '../support/key-pairs';

const SECRET = 'supersecretkeysupersecretkey';
const PAYLOAD = { id: '39fb8463-8c29-4434-a5d6-07b964b36ad9', name: 'Alice', roles: ['user'] };
const OTHER_SECRET = 'another-secret-of-16+';

describe('jwt', () => {
  afterAll(() => {
    workers.terminate();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs and verifies the payload', async () => {
    const signed = await jwt.sign(PAYLOAD, SECRET, { expiresIn: 60 });
    expect(typeof signed).toBe('string');
    const verified = await jwt.verify<typeof PAYLOAD & { iat: number }>(signed, SECRET);
    expect(verified.id).toBe(PAYLOAD.id);
    expect(Math.abs(verified.iat - Date.now() / 1000)).toBeLessThan(5);
  });

  it('explains why a JWT is rejected', async () => {
    const signedElsewhere = await jwt.sign(PAYLOAD, OTHER_SECRET, { expiresIn: 60 });
    await expect(jwt.verify(signedElsewhere, SECRET)).rejects.toMatchObject({
      code: 'TAMPERED',
      message: 'JWT signature is invalid or the key is wrong.',
    });
    await expect(
      jwt.verify('eyJhbGciOiJIUzI1NiIsIajjA7PbDW9AkOaEykb0', SECRET),
    ).rejects.toMatchObject({
      code: 'MALFORMED',
      message: 'Invalid JWT format.',
    });
    await expect(jwt.verify(1 as unknown as string, SECRET)).rejects.toThrow(
      'jwt must be a string.',
    );
  });

  it('decodes without verifying', async () => {
    const signedElsewhere = await jwt.sign(PAYLOAD, OTHER_SECRET, { expiresIn: 60 });
    expect((await jwt.decode(signedElsewhere)).id).toBe(PAYLOAD.id);
    await expect(jwt.decode('eyJhbGciOiJIUzI1ajjA7PbDW9AkOaEykb0')).rejects.toMatchObject({
      code: 'MALFORMED',
      message: 'Invalid JWT format.',
    });
    await expect(jwt.decode({} as unknown as string)).rejects.toThrow('jwt must be a string.');
  });

  it('expires and checks issuer and audience', async () => {
    vi.useFakeTimers({
      now: new Date('2030-01-01T00:00:00Z'),
      toFake: ['Date'],
    });
    const signed = await jwt.sign({ id: 7 }, SECRET, {
      expiresIn: 60,
      issuer: 'archi',
      audience: ['web', 'api'],
      subject: 'user-7',
    });
    expect((await jwt.verify(signed, SECRET, { issuer: 'archi', audience: 'api' })).sub).toBe(
      'user-7',
    );
    await expect(jwt.verify(signed, SECRET, { issuer: 'other' })).rejects.toThrow(
      'JWT issuer is not other.',
    );
    vi.setSystemTime(new Date('2030-01-01T00:01:00Z'));
    await expect(jwt.verify(signed, SECRET)).rejects.toMatchObject({
      code: 'EXPIRED',
      message: 'JWT expired.',
    });
  });

  it('picks the algorithm of the level', async () => {
    const signed = await jwt.sign({}, SECRET, { level: 'cnsa', expiresIn: 60 });
    expect(JSON.parse(Buffer.from(signed.split('.')[0], 'base64url').toString()).alg).toBe('HS512');
    await expect(jwt.verify(signed, SECRET, { algorithms: ['HS256'] })).rejects.toThrow(
      'JWT algorithm is not allowed for this key or these options.',
    );
  });

  it('signs with an RSA private key and verifies with the public key', async () => {
    const pair = await basicKeyPair();
    const signed = await jwt.sign({ id: 7 }, pair.privateKey, {
      algorithm: 'RS256',
      expiresIn: 60,
    });
    expect((await jwt.verify(signed, pair.publicKey)).id).toBe(7);
    await expect(jwt.verify(signed, SECRET)).rejects.toThrow(
      'JWT algorithm is not allowed for this key or these options.',
    );
  }, 120_000);

  it('requires an expiration unless told otherwise', async () => {
    await expect(jwt.sign({ id: 7 }, SECRET)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message:
        'A JWT needs an expiration: pass expiresIn, an exp claim or requireExpiration: false.',
    });
    const forever = await jwt.sign({ id: 7 }, SECRET, { requireExpiration: false });
    await expect(jwt.verify(forever, SECRET)).rejects.toMatchObject({
      code: 'MALFORMED',
      message: 'JWT has no exp claim; pass requireExpiration: false to accept it.',
    });
    expect((await jwt.verify(forever, SECRET, { requireExpiration: false })).id).toBe(7);
    await expect(
      jwt.verify(forever, SECRET, { requireExpiration: false, clockTolerance: -1 }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('rejects short secrets and invalid payloads', async () => {
    await expect(jwt.sign({}, 'short')).rejects.toMatchObject({
      code: 'INVALID_KEY',
      message: 'Secret key must have at least 16 characters.',
    });
    await expect(jwt.sign(null as unknown as Record<string, unknown>, SECRET)).rejects.toThrow(
      'payload must be a plain object.',
    );
    await expect(jwt.sign({}, 1 as unknown as string)).rejects.toThrow('key must be a string.');
    await expect(jwt.sign({ id: BigInt(7) }, SECRET)).rejects.toMatchObject({
      name: 'CryptoError',
      code: 'INVALID_INPUT',
    });
    const signed = await jwt.sign({}, SECRET, { expiresIn: 60 });
    await expect(jwt.verify(signed, 'short')).rejects.toMatchObject({
      code: 'INVALID_KEY',
      message: 'Secret key must have at least 16 characters.',
    });
  });
});
