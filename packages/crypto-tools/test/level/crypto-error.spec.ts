import { describe, expect, it } from '@jest/globals';
import { CRYPTO_ERROR_CODES, CryptoError } from '../../src/level/crypto-error';

describe('CryptoError', () => {
  it('keeps a code and a message', () => {
    const error = new CryptoError('TAMPERED', 'Data may have been tampered with.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CryptoError');
    expect(error.code).toBe('TAMPERED');
    expect(error.message).toBe('Data may have been tampered with.');
  });

  it('reads the code and message the wasm module sends', () => {
    const error = CryptoError.from('EXPIRED|Token expired.');
    expect(error.code).toBe('EXPIRED');
    expect(error.message).toBe('Token expired.');
  });

  it('treats anything else as invalid input', () => {
    expect(CryptoError.from(new TypeError('not a string')).code).toBe('INVALID_INPUT');
    expect(CryptoError.from('NOPE|message').message).toBe('NOPE|message');
    expect(CryptoError.from('|message').code).toBe('INVALID_INPUT');
    expect(CryptoError.from(42).message).toBe('42');
  });

  it('returns a CryptoError unchanged', () => {
    const error = new CryptoError('WORKER', 'stopped');
    expect(CryptoError.from(error)).toBe(error);
  });

  it('lists every code', () => {
    expect(CRYPTO_ERROR_CODES).toEqual([
      'INVALID_KEY',
      'INVALID_INPUT',
      'TAMPERED',
      'EXPIRED',
      'MALFORMED',
      'UNSUPPORTED',
      'WORKER',
    ]);
  });
});
