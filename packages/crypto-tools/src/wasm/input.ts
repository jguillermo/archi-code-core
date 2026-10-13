import { CryptoError } from '../level/crypto-error';

function isUint8Array(value: unknown): value is Uint8Array {
  return Object.prototype.toString.call(value) === '[object Uint8Array]';
}

function isWholeBuffer(data: Uint8Array): boolean {
  return (
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength &&
    Object.prototype.toString.call(data.buffer) === '[object ArrayBuffer]'
  );
}

export function toBytes(data: unknown, name = 'data'): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  if (isUint8Array(data)) {
    return isWholeBuffer(data) ? data : new Uint8Array(data);
  }
  throw new CryptoError('INVALID_INPUT', `${name} must be a string or a Uint8Array.`);
}

export function requireText(value: unknown, name: string, prefix = ''): string {
  if (typeof value !== 'string') {
    throw new CryptoError('INVALID_INPUT', `${prefix}${name} must be a string.`);
  }
  return value;
}

export function requireObject(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CryptoError('INVALID_INPUT', `${name} must be a plain object.`);
  }
  return value as Record<string, unknown>;
}

export function nowInSeconds(): number {
  return Date.now() / 1000;
}
