/**
 * Options of convert that carry rules PORTED FROM THE VALIDATORS. Each block shows why the
 * ported rule is not compatible with the converter's default rule.
 */
import { describe, expect, it } from '@jest/globals';
import {
  ConvertMessages,
  toBoolean,
  toDate,
  toFloat,
  toInteger,
  toJsonValue,
} from '../../src/convert';

const fail = (error: string): unknown => ({ ok: false, value: null, error });

describe('toBoolean modes (ported from isBoolean)', () => {
  it('default trims and ignores case; strict does neither', () => {
    expect(toBoolean(' TRUE ')).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean(' TRUE ', { mode: 'strict' })).toEqual(fail(ConvertMessages.BOOLEAN));
    expect(toBoolean('true', { mode: 'strict' })).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean('0', { mode: 'strict' })).toEqual({ ok: true, value: false, error: null });
  });
  it('loose lower-cases (no trim) and accepts yes/no', () => {
    expect(toBoolean('YES', { mode: 'loose' })).toEqual({ ok: true, value: true, error: null });
    expect(toBoolean('No', { mode: 'loose' })).toEqual({ ok: true, value: false, error: null });
    expect(toBoolean(' yes', { mode: 'loose' })).toEqual(fail(ConvertMessages.BOOLEAN));
    expect(toBoolean('yes')).toEqual(fail(ConvertMessages.BOOLEAN));
  });
  it('unknown modes fall back to default (converters never throw)', () => {
    expect(toBoolean(' true ', { mode: 'nope' as never })).toEqual({
      ok: true,
      value: true,
      error: null,
    });
  });
});

describe('toInteger syntax: validator (ported from isInt)', () => {
  it('accepts a leading +, does not trim, has no safe-range limit', () => {
    expect(toInteger('+12', { syntax: 'validator' })).toEqual({ ok: true, value: 12, error: null });
    expect(toInteger('+12')).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger(' 12', { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger('9007199254740993', { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger(1e21, { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger(1.5, { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
    expect(toInteger(null, { syntax: 'validator' })).toEqual(fail(ConvertMessages.INTEGER));
  });
  it('allowLeadingZeroes: false rejects "012"', () => {
    expect(toInteger('012', { syntax: 'validator' }).ok).toBe(true);
    expect(toInteger('012', { syntax: 'validator', allowLeadingZeroes: false }).ok).toBe(false);
  });
});

describe('toFloat syntax: validator (ported from isFloat)', () => {
  it('does not trim and honours the decimal separator', () => {
    expect(toFloat(' 1.5', { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
    expect(toFloat('1.5', { syntax: 'validator' })).toEqual({ ok: true, value: 1.5, error: null });
    expect(toFloat('1,5', { syntax: 'validator', decimalSeparator: ',' })).toEqual({
      ok: true,
      value: 1.5,
      error: null,
    });
    expect(toFloat('1,5', { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
  });
  it('keeps the historic syntax quirks: ".e5" is accepted with value NaN', () => {
    const r = toFloat('.e5', { syntax: 'validator' });
    expect(r.ok).toBe(true);
    expect(r.value).toBeNaN();
    expect(toFloat('.e5').ok).toBe(false);
  });
  it('numbers: finite only; unreadable values fail', () => {
    expect(toFloat(Infinity, { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
    expect(toFloat(2, { syntax: 'validator' })).toEqual({ ok: true, value: 2, error: null });
    expect(toFloat({}, { syntax: 'validator' })).toEqual(fail(ConvertMessages.FLOAT));
  });
  it('the separator is escaped (no regex injection) and the regex cache is bounded', () => {
    expect(toFloat('1*5', { syntax: 'validator', decimalSeparator: '*' }).ok).toBe(true);
    expect(toFloat('1x5', { syntax: 'validator', decimalSeparator: '*' }).ok).toBe(false);
    for (let i = 0; i < 100; i++) toFloat('1', { syntax: 'validator', decimalSeparator: `s${i}` });
    expect(toFloat('1s995', { syntax: 'validator', decimalSeparator: 's99' }).ok).toBe(true);
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

describe('toDate format (ported from isDate)', () => {
  it('parses by the given format and returns the UTC date', () => {
    const r = toDate('31/01/2024', { format: 'DD/MM/YYYY' });
    expect(r.ok && r.value.toISOString()).toBe('2024-01-31T00:00:00.000Z');
    expect(toDate('31/01/2024')).toEqual(fail(ConvertMessages.DATE));
  });
  it('rejects impossible dates and honours strictMode', () => {
    expect(toDate('2024/02/30', { format: 'YYYY/MM/DD' })).toEqual(fail(ConvertMessages.DATE));
    expect(toDate('2024-01-31', { format: 'YYYY/MM/DD' }).ok).toBe(true);
    expect(toDate('2024-01-31', { format: 'YYYY/MM/DD', strictMode: true }).ok).toBe(false);
  });
  it('Date instances are accepted unless strictMode', () => {
    expect(toDate(new Date(0), { format: 'YYYY/MM/DD' }).ok).toBe(true);
    expect(toDate(new Date(0), { format: 'YYYY/MM/DD', strictMode: true }).ok).toBe(false);
  });
});

describe('toDate iso (the former default ISO rule)', () => {
  it('reads date-times and zones; rejects impossible values', () => {
    expect(toDate('2024-01-01T10:00:00+02:00', { iso: true }).ok).toBe(true);
    for (const v of [
      '2024-02-30',
      '2024-01-01T24:00:00',
      '2024-01-01T10:00:00+01:60',
      '2024/01/01',
      42,
      new Date('x'),
    ]) {
      expect(toDate(v, { iso: true })).toEqual(fail(ConvertMessages.DATE));
    }
    const d = new Date(0);
    expect(toDate(d, { iso: true })).toEqual({ ok: true, value: d, error: null });
  });
});
