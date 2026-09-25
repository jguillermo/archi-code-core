import { describe, expect, it } from '@jest/globals';
import { toBoolean, ConvertMessages } from '../../src/convert';
import { converted, expectNotConvertible } from './helpers';

describe('toBoolean', () => {
  // ─── valid conversions ────────────────────────────────────────────────────

  describe('boolean → same value', () => {
    it('true → true', () => expect(converted(toBoolean(true))).toBe(true));
    it('false → false', () => expect(converted(toBoolean(false))).toBe(false));
  });

  describe('number → boolean (only 1 and 0)', () => {
    it('1 → true', () => expect(converted(toBoolean(1))).toBe(true));
    it('0 → false', () => expect(converted(toBoolean(0))).toBe(false));
    it('-0 → false (-0 === 0)', () => expect(converted(toBoolean(-0))).toBe(false));
  });

  describe('string → boolean (case-insensitive, trims whitespace)', () => {
    it.each(['true', 'TRUE', 'True', 'tRuE', '  true  ', '1', '  1  '])('"%s" → true', (s) =>
      expect(converted(toBoolean(s))).toBe(true),
    );
    it.each(['false', 'FALSE', 'False', 'fAlSe', '  false  ', '0', '  0  '])('"%s" → false', (s) =>
      expect(converted(toBoolean(s))).toBe(false),
    );
  });

  // ─── error cases ──────────────────────────────────────────────────────────
  //

  describe('numbers that are not 0 or 1 → { ok: false, error }', () => {
    it('2 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(2), ConvertMessages.BOOLEAN));
    it('-1 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(-1), ConvertMessages.BOOLEAN));
    it('0.5 → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(0.5), ConvertMessages.BOOLEAN));

    it('NaN → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(NaN), ConvertMessages.BOOLEAN));
    it('Infinity → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Infinity), ConvertMessages.BOOLEAN));
    it('-Infinity → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(-Infinity), ConvertMessages.BOOLEAN));
  });

  describe('strings that are not true/false/0/1 → { ok: false, error }', () => {
    it('"maybe" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('maybe'), ConvertMessages.BOOLEAN));
    it('"yes" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('yes'), ConvertMessages.BOOLEAN));
    it('"" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(''), ConvertMessages.BOOLEAN));
    it('" " → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(' '), ConvertMessages.BOOLEAN));
    it('"2" → { ok: false, error }', () =>
      expectNotConvertible(toBoolean('2'), ConvertMessages.BOOLEAN));
  });

  describe('null and undefined', () => {
    it('null → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(null), ConvertMessages.BOOLEAN));
    it('undefined → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(undefined), ConvertMessages.BOOLEAN));
  });

  describe('plain objects and arrays → { ok: false, error }', () => {
    it('{} → { ok: false, error }', () =>
      expectNotConvertible(toBoolean({}), ConvertMessages.BOOLEAN));
    it('{ a: 1 } → { ok: false, error }', () =>
      expectNotConvertible(toBoolean({ a: 1 }), ConvertMessages.BOOLEAN));
    it('[] → { ok: false, error }', () =>
      expectNotConvertible(toBoolean([]), ConvertMessages.BOOLEAN));
    it('[true] → { ok: false, error }', () =>
      expectNotConvertible(toBoolean([true]), ConvertMessages.BOOLEAN));
  });

  describe('functions → { ok: false, error }', () => {
    it('arrow fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(() => {}),
        ConvertMessages.BOOLEAN,
      ));
    it('async fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(async () => {}),
        ConvertMessages.BOOLEAN,
      ));
    it('named fn → { ok: false, error }', () =>
      expectNotConvertible(
        toBoolean(function foo() {}),
        ConvertMessages.BOOLEAN,
      ));
  });

  describe('Symbol → { ok: false, error }', () => {
    it('Symbol("x") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Symbol('x')), ConvertMessages.BOOLEAN));
    it('Symbol() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(Symbol()), ConvertMessages.BOOLEAN));
  });

  describe('BigInt → { ok: false, error }', () => {
    it('BigInt(0) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(BigInt(0)), ConvertMessages.BOOLEAN));
    it('BigInt(1) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(BigInt(1)), ConvertMessages.BOOLEAN));
  });

  describe('well-known objects → { ok: false, error }', () => {
    it('new Map() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Map()), ConvertMessages.BOOLEAN));
    it('new Set() → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Set()), ConvertMessages.BOOLEAN));
    it('new Promise(() => {}) → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Promise(() => {})), ConvertMessages.BOOLEAN));
    it('/regex/ → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(/regex/), ConvertMessages.BOOLEAN));
    it('new Error("x") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Error('x')), ConvertMessages.BOOLEAN));
    it('new Date("2024-01-01") → { ok: false, error }', () =>
      expectNotConvertible(toBoolean(new Date('2024-01-01')), ConvertMessages.BOOLEAN));
  });
});
