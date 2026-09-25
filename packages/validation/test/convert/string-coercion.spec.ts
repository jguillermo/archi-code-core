/**
 * Base string coercion used directly by the validators (formerly validators/util/tryToString,
 * moved here when the helper was removed in favour of convert/string).
 */
import assert from 'assert';
import { toString, ConvertMessages } from '../../src/convert';

describe('toString as the validators base string coercion', () => {
  it('returns string for string input', () => {
    assert.deepStrictEqual(toString('hello'), { ok: true, value: 'hello', error: null });
    assert.deepStrictEqual(toString(''), { ok: true, value: '', error: null });
  });

  it('returns string for boolean input', () => {
    assert.deepStrictEqual(toString(true), { ok: true, value: 'true', error: null });
    assert.deepStrictEqual(toString(false), { ok: true, value: 'false', error: null });
  });

  it('returns string for finite number', () => {
    assert.deepStrictEqual(toString(42), { ok: true, value: '42', error: null });
    assert.deepStrictEqual(toString(0), { ok: true, value: '0', error: null });
    assert.deepStrictEqual(toString(3.14), { ok: true, value: '3.14', error: null });
  });

  it('returns false for null', () =>
    assert.deepStrictEqual(toString(null), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for undefined', () =>
    assert.deepStrictEqual(toString(undefined), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for NaN', () =>
    assert.deepStrictEqual(toString(NaN), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for Infinity', () =>
    assert.deepStrictEqual(toString(Infinity), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for objects', () =>
    assert.deepStrictEqual(toString({}), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for arrays', () =>
    assert.deepStrictEqual(toString([]), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));
  it('returns false for Symbol', () =>
    assert.deepStrictEqual(toString(Symbol('x')), {
      ok: false,
      value: null,
      error: ConvertMessages.STRING,
    }));

  it('never throws', () => {
    assert.doesNotThrow(() => toString(null));
    assert.doesNotThrow(() => toString({}));
    assert.doesNotThrow(() => toString(Symbol()));
  });
});
