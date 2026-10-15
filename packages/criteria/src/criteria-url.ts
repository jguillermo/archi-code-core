import { CriteriaError } from './criteria-error';

const URL_ALPHABET = /^[A-Za-z0-9_-]+$/;

export function encodeUrlText(json: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(json));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeUrlText(text: unknown): unknown {
  if (typeof text !== 'string' || !URL_ALPHABET.test(text) || text.length % 4 === 1) {
    throw new CriteriaError('INVALID_TEXT', 'The criteria text is not a valid criteria URL value');
  }
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new CriteriaError('INVALID_TEXT', 'The criteria text is not a valid criteria URL value');
  }
}
