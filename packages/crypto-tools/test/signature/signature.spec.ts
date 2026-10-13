import { afterAll, describe, expect, it } from '@jest/globals';
import { signature } from '../../src/signature/signature';
import { workers } from '../../src/worker/workers';
import { basicKeyPair, cnsaKeyPair } from '../support/key-pairs';

const TIMEOUT = 120_000;

describe('signature', () => {
  afterAll(() => {
    workers.terminate();
  });

  it(
    'signs a file and verifies it with the public key',
    async () => {
      const pair = await basicKeyPair();
      const file = Uint8Array.from({ length: 1_000_000 }, (_, index) => index % 256);
      const signed = await signature.sign(file, pair.privateKey);
      expect(signed).toMatch(/^[\w-]+\.\.[\w-]+$/);
      expect(await signature.verify(file, signed, pair.publicKey)).toBe(true);
      const altered = file.slice();
      altered[123] ^= 1;
      expect(await signature.verify(altered, signed, pair.publicKey)).toBe(false);
    },
    TIMEOUT,
  );

  it(
    'records the algorithm of the level in the signature',
    async () => {
      const pair = await cnsaKeyPair();
      const signed = await signature.sign('contract', pair.privateKey, { level: 'cnsa' });
      const header = JSON.parse(Buffer.from(signed.split('.')[0], 'base64url').toString());
      expect(header).toEqual({ alg: 'PS512', b64: false, crit: ['b64'] });
      expect(await signature.verify('contract', signed, pair.publicKey)).toBe(true);
      expect(await signature.verify('contract', signed, (await basicKeyPair()).publicKey)).toBe(
        false,
      );
    },
    TIMEOUT,
  );

  it(
    'rejects broken signatures, invalid keys and invalid input',
    async () => {
      const pair = await basicKeyPair();
      expect(await signature.verify('x', 'not-a-signature', pair.publicKey)).toBe(false);
      await expect(signature.sign('x', 'nope')).rejects.toMatchObject({ code: 'INVALID_KEY' });
      await expect(signature.sign(5 as unknown as string, pair.privateKey)).rejects.toThrow(
        'data must be a string or a Uint8Array.',
      );
      await expect(signature.verify('x', 1 as unknown as string, pair.publicKey)).rejects.toThrow(
        'signature must be a string.',
      );
    },
    TIMEOUT,
  );
});
