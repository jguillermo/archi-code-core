import { afterAll, describe, expect, it } from 'vitest';
import { constants, createCipheriv, privateDecrypt, publicEncrypt, randomBytes } from 'crypto';
import { rsa } from '../../src/rsa/rsa';
import { workers } from '../../src/worker/workers';
import { basicKeyPair, cnsaKeyPair } from '../support/key-pairs';

const TIMEOUT = 120_000;

describe('rsa', () => {
  afterAll(() => {
    workers.terminate();
  });

  it(
    'generates PEM key pairs of the standard size by default',
    async () => {
      const pair = await rsa.generateKeyPair();
      expect(pair.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
      expect(pair.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
      const encrypted = await rsa.encrypt('x', pair.publicKey, { level: 'standard' });
      expect(await rsa.decrypt(encrypted, pair.privateKey)).toBe('x');
    },
    TIMEOUT,
  );

  it(
    'encrypts text and files of any size for the private key owner',
    async () => {
      const pair = await basicKeyPair();
      const file = Uint8Array.from({ length: 300_000 }, (_, index) => (index * 7) % 256);
      const encrypted = await rsa.encrypt(file, pair.publicKey);
      expect(encrypted.split('.')).toHaveLength(5);
      expect(await rsa.decryptBytes(encrypted, pair.privateKey)).toEqual(file);
      const text = await rsa.encrypt('hola', pair.publicKey, { level: 'basic' });
      expect(await rsa.decrypt(text, pair.privateKey)).toBe('hola');
    },
    TIMEOUT,
  );

  it(
    'produces standard RSA-OAEP and AES-GCM that Node crypto reads and writes',
    async () => {
      const pair = await basicKeyPair();
      const oaep = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' };
      const encrypted = await rsa.encrypt('from wasm', pair.publicKey);
      const [header, wrapped] = encrypted.split('.');
      const contentKey = privateDecrypt(
        { key: pair.privateKey, ...oaep },
        Buffer.from(wrapped, 'base64url'),
      );
      expect(contentKey).toHaveLength(32);

      const key = randomBytes(32);
      const nonce = randomBytes(12);
      const nodeHeader = Buffer.from('{"alg":"RSA-OAEP-256","enc":"A256GCM"}').toString(
        'base64url',
      );
      const aes = createCipheriv('aes-256-gcm', key, nonce).setAAD(Buffer.from(nodeHeader));
      const ciphertext = Buffer.concat([aes.update('from node'), aes.final()]);
      const token = [
        nodeHeader,
        publicEncrypt({ key: pair.publicKey, ...oaep }, key),
        nonce,
        ciphertext,
        aes.getAuthTag(),
      ]
        .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
        .join('.');
      expect(header).toBe(nodeHeader);
      expect(await rsa.decrypt(token, pair.privateKey)).toBe('from node');
    },
    TIMEOUT,
  );

  it(
    'uses the strongest hash with cnsa keys',
    async () => {
      const pair = await cnsaKeyPair();
      const encrypted = await rsa.encrypt('secret', pair.publicKey, { level: 'cnsa' });
      const header = JSON.parse(Buffer.from(encrypted.split('.')[0], 'base64url').toString());
      expect(header).toEqual({ alg: 'RSA-OAEP-512', enc: 'A256GCM' });
      expect(await rsa.decrypt(encrypted, pair.privateKey)).toBe('secret');
    },
    TIMEOUT,
  );

  it(
    'refuses keys smaller than the level and wrong private keys',
    async () => {
      const basic = await basicKeyPair();
      await expect(rsa.encrypt('x', basic.publicKey, { level: 'military' })).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
      const encrypted = await rsa.encrypt('x', basic.publicKey);
      await expect(rsa.decrypt(encrypted, (await cnsaKeyPair()).privateKey)).rejects.toMatchObject({
        code: 'TAMPERED',
      });
      await expect(rsa.encrypt('x', 'not a key')).rejects.toMatchObject({ code: 'INVALID_KEY' });
      await expect(rsa.generateKeyPair({ level: 'cnsa', bits: 2048 })).rejects.toMatchObject({
        code: 'UNSUPPORTED',
      });
    },
    TIMEOUT,
  );

  it('validates its input', async () => {
    await expect(rsa.encrypt('x', 1 as unknown as string)).rejects.toThrow(
      'publicKey must be a string.',
    );
    await expect(rsa.decrypt(1 as unknown as string, 'k')).rejects.toThrow(
      'encrypted must be a string.',
    );
    await expect(rsa.decryptBytes('x', 1 as unknown as string)).rejects.toThrow(
      'privateKey must be a string.',
    );
  });
});
