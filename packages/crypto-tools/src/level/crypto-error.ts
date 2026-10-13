export const CRYPTO_ERROR_CODES = [
  'INVALID_KEY',
  'INVALID_INPUT',
  'TAMPERED',
  'EXPIRED',
  'MALFORMED',
  'UNSUPPORTED',
  'WORKER',
] as const;

export type CryptoErrorCode = (typeof CRYPTO_ERROR_CODES)[number];

function isCryptoErrorCode(value: string): value is CryptoErrorCode {
  return (CRYPTO_ERROR_CODES as readonly string[]).includes(value);
}

export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string) {
    super(message);
    this.name = 'CryptoError';
    this.code = code;
  }

  static from(raw: unknown): CryptoError {
    if (raw instanceof CryptoError) {
      return raw;
    }
    const text = raw instanceof Error ? raw.message : String(raw);
    const separator = text.indexOf('|');
    const code = text.slice(0, separator);
    if (separator > 0 && isCryptoErrorCode(code)) {
      return new CryptoError(code, text.slice(separator + 1));
    }
    return new CryptoError('INVALID_INPUT', text);
  }
}
