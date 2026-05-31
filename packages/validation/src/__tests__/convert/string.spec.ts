import { describe, expect, it } from '@jest/globals';
import { toString, ConvertError } from '../../convert';

function expectConvertError(fn: () => void, expectedMessage: string): void {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(ConvertError);
  expect((err as ConvertError).message).toBe(expectedMessage);
}

describe('toString', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('string → string (identity)', () => {
    it('empty string "" → ""', () => expect(toString('')).toBe(''));
    it('"hello" → "hello"', () => expect(toString('hello')).toBe('hello'));
    it('"  spaces  " → preserved', () => expect(toString('  spaces  ')).toBe('  spaces  '));
    it('unicode "héllo 🎉" → same', () => expect(toString('héllo 🎉')).toBe('héllo 🎉'));
    it('10 000-char string → same', () => { const s = 'a'.repeat(10_000); expect(toString(s)).toBe(s); });
  });

  describe('boolean → string', () => {
    it('true → "true"', () => expect(toString(true)).toBe('true'));
    it('false → "false"', () => expect(toString(false)).toBe('false'));
  });

  describe('finite number → string', () => {
    it('0 → "0"', () => expect(toString(0)).toBe('0'));
    it('-0 → "0" (negative zero serialises as "0")', () => expect(toString(-0)).toBe('0'));
    it('42 → "42"', () => expect(toString(42)).toBe('42'));
    it('3.14 → "3.14"', () => expect(toString(3.14)).toBe('3.14'));
    it('1e10 → "10000000000"', () => expect(toString(1e10)).toBe('10000000000'));
    it('Number.MAX_SAFE_INTEGER → "9007199254740991"', () => expect(toString(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991'));
  });

  // ─── error cases ──────────────────────────────────────────────────────────
  //
  // Rule: the message must show the ACTUAL VALUE or an unambiguous identifier,
  // never just the typeof result (which loses all value information).
  //
  // Format: Cannot convert <repr(v)> to string
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
    it('NaN → "Cannot convert NaN to string"', () =>
      expectConvertError(() => toString(NaN), 'Cannot convert NaN to string'));
    it('Infinity → "Cannot convert Infinity to string"', () =>
      expectConvertError(() => toString(Infinity), 'Cannot convert Infinity to string'));
    it('-Infinity → "Cannot convert -Infinity to string"', () =>
      expectConvertError(() => toString(-Infinity), 'Cannot convert -Infinity to string'));
  });

  describe('null and undefined', () => {
    it('null → "Cannot convert null to string"  (NOT "object")', () =>
      expectConvertError(() => toString(null), 'Cannot convert null to string'));
    it('undefined → "Cannot convert undefined to string"', () =>
      expectConvertError(() => toString(undefined), 'Cannot convert undefined to string'));
  });

  describe('plain objects and arrays — show JSON value', () => {
    it('{} → "Cannot convert {} to string"', () =>
      expectConvertError(() => toString({}), 'Cannot convert {} to string'));
    it('{ a: 1 } → \'Cannot convert {"a":1} to string\'', () =>
      expectConvertError(() => toString({ a: 1 }), 'Cannot convert {"a":1} to string'));
    it('[] → "Cannot convert [] to string"', () =>
      expectConvertError(() => toString([]), 'Cannot convert [] to string'));
    it('[1,2,3] → "Cannot convert [1,2,3] to string"', () =>
      expectConvertError(() => toString([1, 2, 3]), 'Cannot convert [1,2,3] to string'));
  });

  describe('functions — show [Function] or [Function: name]', () => {
    it('anonymous arrow fn → "Cannot convert [Function] to string"', () =>
      expectConvertError(() => toString(() => {}), 'Cannot convert [Function] to string'));
    it('async fn → "Cannot convert [Function] to string"', () =>
      expectConvertError(() => toString(async () => {}), 'Cannot convert [Function] to string'));
    it('generator fn → "Cannot convert [Function] to string"', () =>
      expectConvertError(() => toString(function* () { yield 1; }), 'Cannot convert [Function] to string'));
    it('named fn → "Cannot convert [Function: foo] to string"', () =>
      expectConvertError(() => toString(function foo() {}), 'Cannot convert [Function: foo] to string'));
  });

  describe('Symbol — show Symbol(description)', () => {
    it('Symbol("x") → "Cannot convert Symbol(x) to string"  (NOT "symbol")', () =>
      expectConvertError(() => toString(Symbol('x')), 'Cannot convert Symbol(x) to string'));
    it('Symbol() → "Cannot convert Symbol() to string"', () =>
      expectConvertError(() => toString(Symbol()), 'Cannot convert Symbol() to string'));
    it('Symbol.for("key") → "Cannot convert Symbol(key) to string"', () =>
      expectConvertError(() => toString(Symbol.for('key')), 'Cannot convert Symbol(key) to string'));
  });

  describe('BigInt — show BigInt(n)', () => {
    it('BigInt(0) → "Cannot convert BigInt(0) to string"  (NOT "bigint")', () =>
      expectConvertError(() => toString(BigInt(0)), 'Cannot convert BigInt(0) to string'));
    it('BigInt(1) → "Cannot convert BigInt(1) to string"', () =>
      expectConvertError(() => toString(BigInt(1)), 'Cannot convert BigInt(1) to string'));
    it('BigInt(42) → "Cannot convert BigInt(42) to string"', () =>
      expectConvertError(() => toString(BigInt(42)), 'Cannot convert BigInt(42) to string'));
    it('BigInt(-5) → "Cannot convert BigInt(-5) to string"', () =>
      expectConvertError(() => toString(BigInt(-5)), 'Cannot convert BigInt(-5) to string'));
  });

  describe('well-known objects — show type name in brackets  (NOT generic "object")', () => {
    it('new Map() → "Cannot convert [Map] to string"', () =>
      expectConvertError(() => toString(new Map()), 'Cannot convert [Map] to string'));
    it('new Set([1,2]) → "Cannot convert [Set] to string"', () =>
      expectConvertError(() => toString(new Set([1, 2])), 'Cannot convert [Set] to string'));
    it('new WeakMap() → "Cannot convert [WeakMap] to string"', () =>
      expectConvertError(() => toString(new WeakMap()), 'Cannot convert [WeakMap] to string'));
    it('new WeakSet() → "Cannot convert [WeakSet] to string"', () =>
      expectConvertError(() => toString(new WeakSet()), 'Cannot convert [WeakSet] to string'));
    it('new Date("2024-01-01") → "Cannot convert [Date] to string"', () =>
      expectConvertError(() => toString(new Date('2024-01-01')), 'Cannot convert [Date] to string'));
    it('new Error("x") → "Cannot convert [Error] to string"', () =>
      expectConvertError(() => toString(new Error('x')), 'Cannot convert [Error] to string'));
    it('/abc/ → "Cannot convert /abc/ to string"  (regex literal)', () =>
      expectConvertError(() => toString(/abc/), 'Cannot convert /abc/ to string'));
    it('new Uint8Array() → "Cannot convert [Uint8Array] to string"', () =>
      expectConvertError(() => toString(new Uint8Array()), 'Cannot convert [Uint8Array] to string'));
    it('new Promise(() => {}) → "Cannot convert [Promise] to string"', () =>
      expectConvertError(() => toString(new Promise(() => {})), 'Cannot convert [Promise] to string'));
    it('generator object → "Cannot convert [Generator] to string"', () => {
      function* gen() { yield 1; }
      expectConvertError(() => toString(gen()), 'Cannot convert [Generator] to string');
    });
  });
});
