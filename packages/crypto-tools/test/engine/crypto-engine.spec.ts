import { afterAll, describe, expect, it } from '@jest/globals';
import { CryptoEngine } from '../../src/engine/crypto-engine';
import { workers } from '../../src/worker/workers';
import { fixtures } from '../support/fixtures';

describe('CryptoEngine', () => {
  const baseHash = 'testhash123';

  afterAll(() => {
    workers.terminate();
  });

  it('should correctly encode and decode a simple message', async () => {
    const machine = new CryptoEngine('testhash123');
    const encoded = await machine.encode('HELLO WORLD');
    expect(encoded).toBe('Pt3/97FmPVoz+4JG');
    expect(await machine.decode(encoded)).toBe('HELLO WORLD');
  });

  it('should handle messages with special characters, emojis, and whitespace', async () => {
    const machine = new CryptoEngine('testhash123');
    const message = 'Hello, World! 😊🔥💻\n\t';
    const encoded = await machine.encode(message);
    expect(encoded).toBe('Px3xUGFvgewLxqCzxU+oBQ0D0CDMba8xfZjIoshO');
    expect(await machine.decode(encoded)).toBe(message);
  });

  it('should handle an empty string without errors', async () => {
    const machine = new CryptoEngine('testhash123');
    expect(await machine.encode('')).toBe('');
    expect(await machine.decode('')).toBe('');
  });

  it('should produce consistent results for the same message and configuration', async () => {
    const machine1 = new CryptoEngine('testhash123');
    const machine2 = new CryptoEngine('testhash123');
    expect(await machine1.encode('Consistency Test')).toBe('BKAJnhf2N76DeiZoak/tYHWk');
    expect(await machine2.encode('Consistency Test')).toBe('BKAJnhf2N76DeiZoak/tYHWk');
  });

  it('should handle messages with various lengths and character sets, including control characters', async () => {
    const machine = new CryptoEngine('testhash123');
    const message = '1234567890!@#$%^&*()_+-=[]{}|;:,.<>?/\\"`~ 🤖🌍🐍🚀\b\r\f\v';
    const encoded = await machine.encode(message);
    expect(encoded).toBe(
      'ZvEAf9TzdS=/ldu/xZv=TE3R6J5+MeaoXmfQ+1MxyL+z7A/t/ky6b/hmd09eMBktRZXJcNcWiPYZ2qOHNTax',
    );
    expect(await machine.decode(encoded)).toBe(message);
  });

  it.each([
    'VGhpcyBpcyBhIEJhc2U2NCB0ZXN0Lg==',
    'Hello こんにちは Привет 🚀 ✨𓂀𓀀𓃰',
    'AbAbAbAbAbAbAbAb',
    'A!@#$%^&*()1234567890'.repeat(100),
    String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)),
  ])('round-trips %#', async (message) => {
    const machine = new CryptoEngine(baseHash);
    expect(await machine.decode(await machine.encode(message))).toBe(message);
  });

  it('should produce different encoded messages for different base hashes', async () => {
    expect(await new CryptoEngine('hash1').encode('HELLO WORLD')).not.toBe(
      await new CryptoEngine('hash2').encode('HELLO WORLD'),
    );
  });

  it('ignores characters outside its alphabet when decoding', async () => {
    const machine = new CryptoEngine('seed-key');
    const encoded = await machine.encode('hello world');
    expect(await machine.decode(`${encoded.slice(0, 4)} ${encoded.slice(4)}`)).toBe('hello world');
  });

  it('reproduces every output of the previous JavaScript engine', async () => {
    for (const { key, samples } of fixtures.engine) {
      const machine = new CryptoEngine(key);
      for (const { message, encoded } of samples) {
        expect(await machine.encode(message)).toBe(encoded);
      }
    }
  });

  it('requires text', async () => {
    expect(() => new CryptoEngine(1 as unknown as string)).toThrow('seedKey must be a string.');
    await expect(new CryptoEngine('k').encode(1 as unknown as string)).rejects.toThrow(
      'message must be a string.',
    );
  });
});
