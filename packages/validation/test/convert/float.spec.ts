import { describe, expect, it } from '@jest/globals';
import { toFloat, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

describe('toFloat', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('finite number → same value', () => {
    it('0 → 0', () => expect(converted(toFloat(0))).toBe(0));
    it('-0 → -0', () => expect(Object.is(converted(toFloat(-0)), -0)).toBe(true));
    it('3.14 → 3.14', () => expect(converted(toFloat(3.14))).toBe(3.14));
    it('42 → 42', () => expect(converted(toFloat(42))).toBe(42));
    it('Number.MAX_VALUE → same', () =>
      expect(converted(toFloat(Number.MAX_VALUE))).toBe(Number.MAX_VALUE));
    it('Number.EPSILON → same', () =>
      expect(converted(toFloat(Number.EPSILON))).toBe(Number.EPSILON));
  });

  describe('string → parsed float', () => {
    it('"3.14" → 3.14', () => expect(converted(toFloat('3.14'))).toBe(3.14));
    it('"42" → 42', () => expect(converted(toFloat('42'))).toBe(42));
    it('"  -1.5  " → -1.5 (trims)', () => expect(converted(toFloat('  -1.5  '))).toBe(-1.5));
    it('".5" → 0.5 (leading dot)', () => expect(converted(toFloat('.5'))).toBe(0.5));
    it('"5." → 5 (trailing dot)', () => expect(converted(toFloat('5.'))).toBe(5));
    it('"+3.14" → 3.14', () => expect(converted(toFloat('+3.14'))).toBe(3.14));
    it('"1e5" → 100000', () => expect(converted(toFloat('1e5'))).toBe(100000));
  });

  // ─── error cases ──────────────────────────────────────────────────────────

  describe('non-finite numbers → { ok: false, error }', () => {
    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toFloat(NaN), ConvertMessages.FLOAT));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Infinity), ConvertMessages.FLOAT));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toFloat(-Infinity), ConvertMessages.FLOAT));
  });

  describe('empty / whitespace strings → { ok: false, error }', () => {
    it('"" → { ok: false, error }', () => expectNotConvertible(toFloat(''), ConvertMessages.FLOAT));
    it('" " → { ok: false, error }', () =>
      expectNotConvertible(toFloat(' '), ConvertMessages.FLOAT));
    it('"   " → { ok: false, error }', () =>
      expectNotConvertible(toFloat('   '), ConvertMessages.FLOAT));
  });

  describe('non-numeric strings → { ok: false, error }', () => {
    it('"hello" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('hello'), ConvertMessages.FLOAT));
    it('"Infinity" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('Infinity'), ConvertMessages.FLOAT));
    it('"NaN" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('NaN'), ConvertMessages.FLOAT));
    it('" hello " → { ok: false, error }', () =>
      expectNotConvertible(toFloat(' hello '), ConvertMessages.FLOAT));
    it('"1,234" → { ok: false, error }', () =>
      expectNotConvertible(toFloat('1,234'), ConvertMessages.FLOAT));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toFloat(null), ConvertMessages.FLOAT));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toFloat(undefined), ConvertMessages.FLOAT));
  });

  describe('booleans → { ok: false, error }', () => {
    it('true → { ok: false, error }', () =>
      expectNotConvertible(toFloat(true), ConvertMessages.FLOAT));
    it('false → { ok: false, error }', () =>
      expectNotConvertible(toFloat(false), ConvertMessages.FLOAT));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () => expectNotConvertible(toFloat({}), ConvertMessages.FLOAT));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toFloat({ a: 1 }), ConvertMessages.FLOAT));
    it('[] → { ok: false, error }', () => expectNotConvertible(toFloat([]), ConvertMessages.FLOAT));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toFloat(() => 3.14),
        ConvertMessages.FLOAT,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toFloat(function calc() {}),
        ConvertMessages.FLOAT,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("pi") → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Symbol('pi')), ConvertMessages.FLOAT));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(Symbol()), ConvertMessages.FLOAT));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(BigInt(1)), ConvertMessages.FLOAT));
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(BigInt(0)), ConvertMessages.FLOAT));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Map()), ConvertMessages.FLOAT));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Set()), ConvertMessages.FLOAT));
    it('new Date() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Date()), ConvertMessages.FLOAT));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Promise(() => {})), ConvertMessages.FLOAT));
    it('new Uint8Array() → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Uint8Array()), ConvertMessages.FLOAT));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toFloat(new Error('x')), ConvertMessages.FLOAT));
  });
});
