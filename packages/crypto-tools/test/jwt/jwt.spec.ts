import { afterAll, afterEach, describe, expect, it, jest } from '@jest/globals';
import { jwt } from '../../src/jwt/jwt';
import { workers } from '../../src/worker/workers';
import { fixtures } from '../support/fixtures';
import { basicKeyPair } from '../support/key-pairs';

const SECRET = 'supersecretkeysupersecretkey';
const PAYLOAD = { id: '39fb8463-8c29-4434-a5d6-07b964b36ad9', name: 'Alice', roles: ['user'] };
const FOREIGN_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM5ZmI4NDYzLThjMjktNDQzNC1hNWQ2LTA3Yjk2NGIzNmFkOSIsInJvbGVzIjpbInVzZXIiXSwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNzM2NTkwOTQ5fQ.sqVH29NXG3LaxwIDfaVg8HwcajjA7PbDW9AkOaEykb0';

describe('jwt', () => {
  afterAll(() => {
    workers.terminate();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('signs and verifies the payload', async () => {
    const signed = await jwt.sign(PAYLOAD, SECRET, { expiresIn: 60 });
    expect(typeof signed).toBe('string');
    const verified = await jwt.verify<typeof PAYLOAD & { iat: number }>(signed, SECRET);
    expect(verified.id).toBe(PAYLOAD.id);
    expect(Math.abs(verified.iat - Date.now() / 1000)).toBeLessThan(5);
  });

  it('verifies tokens signed by the previous jsonwebtoken implementation', async () => {
    const verified = await jwt.verify(fixtures.jwt.token, fixtures.jwt.secret, {
      requireExpiration: false,
    });
    expect(verified.name).toBe('Alice');
  });

  it('keeps the error messages of jsonwebtoken', async () => {
    await expect(jwt.verify(FOREIGN_TOKEN, SECRET)).rejects.toThrow(
      'verify Error: invalid signature',
    );
    await expect(jwt.verify('eyJhbGciOiJIUzI1NiIsIajjA7PbDW9AkOaEykb0', SECRET)).rejects.toThrow(
      'verify Error: jwt malformed',
    );
    await expect(jwt.verify(1 as unknown as string, SECRET)).rejects.toThrow(
      'verify Error: jwt must be a string.',
    );
  });

  it('decodes without verifying', async () => {
    expect((await jwt.decode(await jwt.sign(PAYLOAD, SECRET, { expiresIn: 60 }))).id).toBe(
      PAYLOAD.id,
    );
    expect((await jwt.decode(FOREIGN_TOKEN)).id).toBe(PAYLOAD.id);
    expect(await jwt.decode('eyJhbGciOiJIUzI1ajjA7PbDW9AkOaEykb0')).toEqual({});
    await expect(jwt.decode({} as unknown as string)).rejects.toThrow(/^data Error: /);
  });

  it('expires and checks issuer and audience', async () => {
    jest.useFakeTimers({
      now: new Date('2030-01-01T00:00:00Z'),
      doNotFake: ['setTimeout', 'setImmediate', 'queueMicrotask', 'nextTick'],
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
      'verify Error: jwt issuer invalid. expected: other',
    );
    jest.setSystemTime(new Date('2030-01-01T00:01:00Z'));
    await expect(jwt.verify(signed, SECRET)).rejects.toMatchObject({
      code: 'EXPIRED',
      message: 'verify Error: jwt expired',
    });
    expect(await jwt.verify(signed, SECRET, { ignoreExpiration: true })).toMatchObject({ id: 7 });
  });

  it('picks the algorithm of the level', async () => {
    const signed = await jwt.sign({}, SECRET, { level: 'cnsa', expiresIn: 60 });
    expect(JSON.parse(Buffer.from(signed.split('.')[0], 'base64url').toString()).alg).toBe('HS512');
    await expect(jwt.verify(signed, SECRET, { algorithms: ['HS256'] })).rejects.toThrow(
      'verify Error: invalid algorithm',
    );
  });

  it('signs with an RSA private key and verifies with the public key', async () => {
    const pair = await basicKeyPair();
    const signed = await jwt.sign({ id: 7 }, pair.privateKey, {
      algorithm: 'RS256',
      expiresIn: 60,
    });
    expect((await jwt.verify(signed, pair.publicKey)).id).toBe(7);
    await expect(jwt.verify(signed, SECRET)).rejects.toThrow('verify Error: invalid algorithm');
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
      message: 'verify Error: jwt has no exp claim',
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
      message: 'verify Error: Secret key must have at least 16 characters.',
    });
  });
});
