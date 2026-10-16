import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'vm';
import { nowInSeconds, requireObject, requireText, toBytes, toJson } from '../../src/wasm/input';

describe('input', () => {
  it('turns text into UTF-8 bytes and keeps byte arrays', () => {
    expect([...toBytes('ñ')]).toEqual([195, 177]);
    const bytes = new Uint8Array([1, 2]);
    expect(toBytes(bytes)).toBe(bytes);
    expect(toBytes(Buffer.from([3]))).toStrictEqual(new Uint8Array([3]));
  });

  it('copies a view so the worker never receives the rest of its buffer', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 6]);
    for (const view of [buffer.subarray(2, 4), buffer.subarray(0, 2), Buffer.from('ab')]) {
      const sent = toBytes(view);
      expect(sent).not.toBe(view);
      expect([...sent]).toEqual([...view]);
      expect(sent.byteOffset).toBe(0);
      expect(sent.buffer.byteLength).toBe(view.byteLength);
    }
  });

  it('copies bytes kept in shared memory', () => {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared.set([8, 9]);
    const sent = toBytes(shared);
    expect(sent.buffer).toBeInstanceOf(ArrayBuffer);
    expect([...sent]).toEqual([8, 9]);
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
  });

  it('requires a plain object', () => {
    expect(requireObject({ a: 1 }, 'payload')).toEqual({ a: 1 });
    for (const value of [null, [1], 'x']) {
      expect(() => requireObject(value, 'payload')).toThrow('payload must be a plain object.');
    }
  });

  it('serializes a plain object to JSON or explains why it cannot', () => {
    expect(toJson({ a: 1 }, 'payload')).toBe('{"a":1}');
    expect(() => toJson([1], 'payload')).toThrow('payload must be a plain object.');
    expect(() => toJson({ big: BigInt(1) }, 'payload')).toThrow(
      expect.objectContaining({
        name: 'CryptoError',
        code: 'INVALID_INPUT',
        message: expect.stringContaining('payload cannot be serialized to JSON: '),
      }),
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => toJson(circular, 'payload')).toThrow('payload cannot be serialized to JSON: ');
    const throwing = {
      toJSON: () => {
        throw 'refused';
      },
    };
    expect(() => toJson(throwing, 'payload')).toThrow(
      'payload cannot be serialized to JSON: refused',
    );
  });

  it('gives the current time in seconds', () => {
    expect(Math.abs(nowInSeconds() - Date.now() / 1000)).toBeLessThan(1);
  });
});
