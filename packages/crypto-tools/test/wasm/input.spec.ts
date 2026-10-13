import { describe, expect, it } from '@jest/globals';
import { runInNewContext } from 'vm';
import { nowInSeconds, requireObject, requireText, toBytes } from '../../src/wasm/input';

describe('input', () => {
  it('turns text into UTF-8 bytes and keeps byte arrays', () => {
    expect([...toBytes('ñ')]).toEqual([195, 177]);
    const bytes = new Uint8Array([1, 2]);
    expect(toBytes(bytes)).toBe(bytes);
    expect(toBytes(Buffer.from([3]))).toEqual(Buffer.from([3]));
  });

  it('accepts byte arrays created in another realm', () => {
    const foreign = runInNewContext('new Uint8Array([7])') as Uint8Array;
    expect(toBytes(foreign)).toBe(foreign);
  });

  it('rejects other data', () => {
    expect(() => toBytes(42)).toThrow('data must be a string or a Uint8Array.');
    expect(() => toBytes([1], 'file')).toThrow('file must be a string or a Uint8Array.');
  });

  it('requires text', () => {
    expect(requireText('x', 'key')).toBe('x');
    expect(() => requireText(1, 'key')).toThrow('key must be a string.');
    expect(() => requireText(1, 'jwt', 'verify Error: ')).toThrow(
      'verify Error: jwt must be a string.',
    );
  });

  it('requires a plain object', () => {
    expect(requireObject({ a: 1 }, 'payload')).toEqual({ a: 1 });
    for (const value of [null, [1], 'x']) {
      expect(() => requireObject(value, 'payload')).toThrow('payload must be a plain object.');
    }
  });

  it('gives the current time in seconds', () => {
    expect(Math.abs(nowInSeconds() - Date.now() / 1000)).toBeLessThan(1);
  });
});
