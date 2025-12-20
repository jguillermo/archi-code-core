import { describe, expect, it } from '@jest/globals';
import { CryptoEngine } from './cryptoEngine';

describe('CryptoEngine', () => {
  const baseHash = 'testhash123';

  it('should correctly encode and decode a simple message', () => {
    const machine = new CryptoEngine('testhash123');
    const message = 'HELLO WORLD';

    const encoded = machine.encode(message);
    expect(encoded).toBe('Pt3/97FmPVoz+4JG');
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should handle messages with special characters, emojis, and whitespace', () => {
    const machine = new CryptoEngine('testhash123');
    const message = 'Hello, World! 😊🔥💻\n\t';

    const encoded = machine.encode(message);
    expect(encoded).toBe('Px3xUGFvgewLxqCzxU+oBQ0D0CDMba8xfZjIoshO');
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should handle an empty string without errors', () => {
    const machine = new CryptoEngine('testhash123');
    const message = '';

    const encoded = machine.encode(message);
    expect(encoded).toBe('');
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should produce consistent results for the same message and configuration', () => {
    const machine1 = new CryptoEngine('testhash123');
    const machine2 = new CryptoEngine('testhash123');
    const message = 'Consistency Test';

    const encoded1 = machine1.encode(message);
    expect(encoded1).toBe('BKAJnhf2N76DeiZoak/tYHWk');
    const encoded2 = machine2.encode(message);
    expect(encoded2).toBe('BKAJnhf2N76DeiZoak/tYHWk');

    expect(encoded1).toBe(encoded2);

    const decoded1 = machine1.decode(encoded1);
    const decoded2 = machine2.decode(encoded2);

    expect(decoded1).toBe(decoded2);
    expect(decoded1).toBe(message);
  });

  it('should handle messages with various lengths and character sets, including control characters', () => {
    const machine = new CryptoEngine('testhash123');
    const message = '1234567890!@#$%^&*()_+-=[]{}|;:,.<>?/\\"`~ 🤖🌍🐍🚀\b\r\f\v';

    const encoded = machine.encode(message);
    expect(encoded).toBe('ZvEAf9TzdS=/ldu/xZv=TE3R6J5+MeaoXmfQ+1MxyL+z7A/t/ky6b/hmd09eMBktRZXJcNcWiPYZ2qOHNTax');
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should encode and decode a message entirely in Base64 format', () => {
    const machine = new CryptoEngine(baseHash);
    const message = 'VGhpcyBpcyBhIEJhc2U2NCB0ZXN0Lg=='; // "This is a Base64 test."

    const encoded = machine.encode(message);
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should not mutate the original message', () => {
    const machine = new CryptoEngine(baseHash);
    const message = 'Original Message';
    const originalCopy = message.slice();

    machine.encode(message);

    expect(message).toBe(originalCopy);
  });

  it('should produce different encoded messages for different base hashes', () => {
    const machine1 = new CryptoEngine('hash1');
    const machine2 = new CryptoEngine('hash2');
    const message = 'HELLO WORLD';

    const encoded1 = machine1.encode(message);
    const encoded2 = machine2.encode(message);

    expect(encoded1).not.toBe(encoded2);
  });

  it('should handle messages with mixed languages and scripts, including uncommon characters', () => {
    const machine = new CryptoEngine(baseHash);
    const message = 'Hello こんにちは Привет 🚀 ✨𓂀𓀀𓃰';

    const encoded = machine.encode(message);
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should encode and decode a message with repeated patterns and alternating cases', () => {
    const machine = new CryptoEngine(baseHash);
    const message = 'AbAbAbAbAbAbAbAb';

    const encoded = machine.encode(message);
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should maintain correct functionality when processing a very long message', () => {
    const machine = new CryptoEngine(baseHash);
    const message = 'A!@#$%^&*()1234567890'.repeat(100); // Very long string

    const encoded = machine.encode(message);
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });

  it('should handle messages with edge-case ASCII characters', () => {
    const machine = new CryptoEngine(baseHash);
    const message = String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i));

    const encoded = machine.encode(message);
    const decoded = machine.decode(encoded);

    expect(decoded).toBe(message);
  });
});
