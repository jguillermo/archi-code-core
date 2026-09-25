import { describe, expect, it } from '@jest/globals';
import { toJson, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from '../cross/support/convertHelpers';
import type { Converted } from '../../src/convert';
import { toJsonValue } from '../../src/convert';

const value = <T>(r: Converted<T>): T | null => r.value;

const fail = (error: string): unknown => ({ ok: false, value: null, error });

describe('toJson', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('object with at least one key → same reference', () => {
    it('{ name, age } → same reference', () => {
      const o = { name: 'Alice', age: 30 };
      expect(converted(toJson(o))).toBe(o);
    });
    it('single-key { a: 1 } → same reference', () => {
      const o = { a: 1 };
      expect(converted(toJson(o))).toBe(o);
    });
    it('null-prototype object and nested plain objects / arrays → same reference', () => {
      const o = Object.assign(Object.create(null), { a: { b: [1, 'x', true, null, { c: 2 }] } });
      expect(converted(toJson(o))).toBe(o);
    });
    it('shared (non-cyclic) references are fine', () => {
      const shared = { x: 1 };
      const o = { a: shared, b: shared, c: [shared] };
      expect(converted(toJson(o))).toBe(o);
    });
    it('deep nesting does not overflow the stack', () => {
      let deep: Record<string, unknown> = { leaf: 1 };
      for (let i = 0; i < 100_000; i++) deep = { next: deep };
      expect(toJson(deep).ok).toBe(true);
    });
  });

  describe('objects that would not survive a JSON round trip → { ok: false, error }', () => {
    class Person {
      constructor(public name: string) {}
    }
    const { proxy: revoked, revoke } = Proxy.revocable({ a: 1 }, {});
    revoke();
    it.each([
      ['class instance', new Person('Bob')],
      ['Uint8Array', new Uint8Array([1, 2])],
      ['function value', { a: () => 1 }],
      ['undefined value', { a: undefined }],
      ['symbol value', { a: Symbol('s') }],
      ['bigint value', { a: BigInt(1) }],
      ['NaN value', { a: NaN }],
      ['Infinity value', { a: Infinity }],
      ['nested Date', { a: new Date(0) }],
      ['nested Map', { a: new Map([[1, 2]]) }],
      ['nested class instance', { a: [new Person('Bob')] }],
      ['toJSON method', { toJSON: () => ({ a: 1 }) }],
      [
        'cycle through an array',
        (() => {
          const o: Record<string, unknown> = { a: [] };
          (o.a as unknown[]).push(o);
          return o;
        })(),
      ],
      [
        'throwing getter',
        Object.defineProperty({ a: 1 }, 'b', {
          enumerable: true,
          get: () => {
            throw new Error('x');
          },
        }),
      ],
      ['revoked proxy', revoked],
    ])('%s', (_label, input) => expect(toJson(input)).toEqual(fail(ConvertMessages.JSON)));
  });

  describe('JSON string of non-empty object → parsed', () => {
    it('\'{"name":"Alice"}\' → { name: "Alice" }', () =>
      expect(converted(toJson('{"name":"Alice"}'))).toEqual({ name: 'Alice' }));
    it('nested JSON string → parsed', () =>
      expect(converted(toJson('{"a":{"b":1}}'))).toEqual({ a: { b: 1 } }));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-object string input → { ok: false, error }', () => {
    it('"hello" → { ok: false, error }', () =>
      expectNotConvertible(toJson('hello'), ConvertMessages.JSON));
    it('"" → { ok: false, error }', () => expectNotConvertible(toJson(''), ConvertMessages.JSON));
    it('"null" → { ok: false, error }', () =>
      expectNotConvertible(toJson('null'), ConvertMessages.JSON));
    it('"true" → { ok: false, error }', () =>
      expectNotConvertible(toJson('true'), ConvertMessages.JSON));
    it('"42" → { ok: false, error }', () =>
      expectNotConvertible(toJson('42'), ConvertMessages.JSON));
    it('"{}" → { ok: false, error }', () =>
      expectNotConvertible(toJson('{}'), ConvertMessages.JSON));
    it('"[]" → { ok: false, error }', () =>
      expectNotConvertible(toJson('[]'), ConvertMessages.JSON));
  });

  describe('null → { ok: false, error }', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toJson(null), ConvertMessages.JSON));
  });

  describe('null and undefined', () => {
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toJson(undefined), ConvertMessages.JSON));
  });

  describe('numbers → { ok: false, error }', () => {
    it('42 → { ok: false, error }', () => expectNotConvertible(toJson(42), ConvertMessages.JSON));
    it('0 → { ok: false, error }', () => expectNotConvertible(toJson(0), ConvertMessages.JSON));
    it('NaN → { ok: false, error }', () => expectNotConvertible(toJson(NaN), ConvertMessages.JSON));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toJson(true), ConvertMessages.JSON));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toJson(false), ConvertMessages.JSON));
  });

  describe('empty object / arrays / objects-with-no-keys → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toJson({}), ConvertMessages.JSON));
    it('[] → { ok: false, error }', () => expectNotConvertible(toJson([]), ConvertMessages.JSON));
    it('[1,2,3] → { ok: false, error }', () =>
      expectNotConvertible(toJson([1, 2, 3]), ConvertMessages.JSON));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toJson(() => ({})),
        ConvertMessages.JSON,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toJson(function foo() {}),
        ConvertMessages.JSON,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toJson(Symbol('x')), ConvertMessages.JSON));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toJson(Symbol()), ConvertMessages.JSON));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toJson(BigInt(1)), ConvertMessages.JSON));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toJson(BigInt(0)), ConvertMessages.JSON));
  });

  describe('well-known objects with 0 own enumerable keys → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Map()), ConvertMessages.JSON));
    it('new Map([["a",1]]) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Map([['a', 1]])), ConvertMessages.JSON));
    it('new Set([1,2]) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Set([1, 2])), ConvertMessages.JSON));
    it('new Date("2024-01-01") → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Date('2024-01-01')), ConvertMessages.JSON));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Error('x')), ConvertMessages.JSON));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toJson(new Promise(() => {})), ConvertMessages.JSON));
    it('new WeakMap() → { ok: false, error }', () =>
      expectNotConvertible(toJson(new WeakMap()), ConvertMessages.JSON));
  });
});

describe('convert rules — { ok, value, error }', () => {
  describe('toJson / toArray — single JSON.parse', () => {
    it('toJson', () => {
      expect(value(toJson('{"a":1}'))).toEqual({ a: 1 });
      expect(toJson('[1]')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      expect(toJson('{}')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      expect(toJson('{')).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      expect(toJson(circular)).toEqual({ ok: false, value: null, error: ConvertMessages.JSON });
      const obj = { a: 1 };
      expect(value(toJson(obj))).toBe(obj);
    });
  });
});

describe('toJsonValue (ported from isJSON)', () => {
  it('any object or array is accepted, unlike toJson', () => {
    expect(toJsonValue('{}')).toEqual({ ok: true, value: {}, error: null });
    expect(toJsonValue('[1]')).toEqual({ ok: true, value: [1], error: null });
  });
  it('primitives are opt-in', () => {
    expect(toJsonValue('null')).toEqual(fail(ConvertMessages.JSON_VALUE));
    expect(toJsonValue('true', { allowPrimitives: true })).toEqual({
      ok: true,
      value: true,
      error: null,
    });
    expect(toJsonValue('42', { allowPrimitives: true })).toEqual(fail(ConvertMessages.JSON_VALUE));
    expect(toJsonValue('42', { allowAnyValue: true })).toEqual({
      ok: true,
      value: 42,
      error: null,
    });
  });
  it('invalid text and unreadable values fail', () => {
    expect(toJsonValue('{')).toEqual(fail(ConvertMessages.JSON_VALUE));
    expect(toJsonValue({ a: 1 })).toEqual(fail(ConvertMessages.JSON_VALUE));
  });
});
