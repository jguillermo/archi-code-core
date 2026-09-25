import { describe, expect, it } from '@jest/globals';
import { toString, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

describe('toString', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('string → string (identity)', () => {
    it('empty string "" → ""', () => expect(converted(toString(''))).toBe(''));
    it('"hello" → "hello"', () => expect(converted(toString('hello'))).toBe('hello'));
    it('"  spaces  " → preserved', () =>
      expect(converted(toString('  spaces  '))).toBe('  spaces  '));
    it('unicode "héllo 🎉" → same', () => expect(converted(toString('héllo 🎉'))).toBe('héllo 🎉'));
    it('10 000-char string → same', () => {
      const s = 'a'.repeat(10_000);
      expect(converted(toString(s))).toBe(s);
    });
  });

  describe('boolean → string', () => {
    it('true → "true"', () => expect(converted(toString(true))).toBe('true'));
    it('false → "false"', () => expect(converted(toString(false))).toBe('false'));
  });

  describe('finite number → string', () => {
    it('0 → "0"', () => expect(converted(toString(0))).toBe('0'));
    it('-0 → "0" (negative zero serialises as "0")', () =>
      expect(converted(toString(-0))).toBe('0'));
    it('42 → "42"', () => expect(converted(toString(42))).toBe('42'));
    it('3.14 → "3.14"', () => expect(converted(toString(3.14))).toBe('3.14'));
    it('1e10 → "10000000000"', () => expect(converted(toString(1e10))).toBe('10000000000'));
    it('Number.MAX_SAFE_INTEGER → "9007199254740991"', () =>
      expect(converted(toString(Number.MAX_SAFE_INTEGER))).toBe('9007199254740991'));
  });

  // ─── error cases ──────────────────────────────────────────────────────────
  //
  //
  //   null          → "null"              (not "object" — typeof null === "object" is misleading)
  //   NaN/Infinity  → their own name
  //   Symbol('x')   → "Symbol(x)"        (not "symbol")
  //   BigInt(n)     → "BigInt(n)"         (not "bigint")
  //   functions     → "[Function]" or "[Function: name]" (not "function")
  //   Map/Set/etc.  → "[Map]", "[Set]", "[Promise]"…  (not generic "object")
  //   RegExp        → "/pattern/"         (not "object")
  //   arrays        → "[1,2,3]"           (JSON)
  //   plain objects → '{"a":1}'           (JSON)

  describe('non-finite numbers', () => {
    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toString(NaN), ConvertMessages.STRING));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toString(Infinity), ConvertMessages.STRING));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toString(-Infinity), ConvertMessages.STRING));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toString(null), ConvertMessages.STRING));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toString(undefined), ConvertMessages.STRING));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () =>
      expectNotConvertible(toString({}), ConvertMessages.STRING));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toString({ a: 1 }), ConvertMessages.STRING));
    it('[] → { ok: false, error }', () =>
      expectNotConvertible(toString([]), ConvertMessages.STRING));
    it('[1,2,3] → { ok: false, error }', () =>
      expectNotConvertible(toString([1, 2, 3]), ConvertMessages.STRING));
  });

  describe('functions → { ok: false, error }', () => {
    it('anonymous arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toString(() => {}),
        ConvertMessages.STRING,
      ));
    it('async fn → { ok: false, error }', () =>
      expectNotConvertible(
        toString(async () => {}),
        ConvertMessages.STRING,
      ));
    it('generator fn → { ok: false, error }', () =>
      expectNotConvertible(
        toString(function* () {
          yield 1;
        }),
        ConvertMessages.STRING,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toString(function foo() {}),
        ConvertMessages.STRING,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toString(Symbol('x')), ConvertMessages.STRING));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toString(Symbol()), ConvertMessages.STRING));
    it('Symbol.for("key") → { ok: false, error }', () =>
      expectNotConvertible(toString(Symbol.for('key')), ConvertMessages.STRING));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toString(BigInt(0)), ConvertMessages.STRING));
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toString(BigInt(1)), ConvertMessages.STRING));
    it('BigInt(42) → { ok: false, error }', () =>
      expectNotConvertible(toString(BigInt(42)), ConvertMessages.STRING));
    it('BigInt(-5) → { ok: false, error }', () =>
      expectNotConvertible(toString(BigInt(-5)), ConvertMessages.STRING));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toString(new Map()), ConvertMessages.STRING));
    it('new Set([1,2]) → { ok: false, error }', () =>
      expectNotConvertible(toString(new Set([1, 2])), ConvertMessages.STRING));
    it('new WeakMap() → { ok: false, error }', () =>
      expectNotConvertible(toString(new WeakMap()), ConvertMessages.STRING));
    it('new WeakSet() → { ok: false, error }', () =>
      expectNotConvertible(toString(new WeakSet()), ConvertMessages.STRING));
    it('new Date("2024-01-01") → { ok: false, error }', () =>
      expectNotConvertible(toString(new Date('2024-01-01')), ConvertMessages.STRING));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toString(new Error('x')), ConvertMessages.STRING));
    it('/abc/ → { ok: false, error }', () =>
      expectNotConvertible(toString(/abc/), ConvertMessages.STRING));
    it('new Uint8Array() → { ok: false, error }', () =>
      expectNotConvertible(toString(new Uint8Array()), ConvertMessages.STRING));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toString(new Promise(() => {})), ConvertMessages.STRING));
    it('generator object → { ok: false, error }', () => {
      function* gen() {
        yield 1;
      }
      expectNotConvertible(toString(gen()), ConvertMessages.STRING);
    });
    it('circular object → { ok: false, error }', () => {
      const obj = {} as any;
      obj.self = obj;
      expectNotConvertible(toString(obj), ConvertMessages.STRING);
    });
  });
});
