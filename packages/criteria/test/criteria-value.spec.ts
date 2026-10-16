import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { compareText, compareValues, isDate, valuesEqual } from '../src/criteria-value';

describe('compareValues', () => {
  it('orders types: null, number, string, boolean, date, others', () => {
    const sorted = [new Date(0), true, 'a', 1, null, { x: 1 }].sort(compareValues);
    expect(sorted).toEqual([null, 1, 'a', true, new Date(0), { x: 1 }]);
  });

  it('compares values of the same type', () => {
    expect(compareValues(1, 2)).toBe(-1);
    expect(compareValues(2, 1)).toBe(1);
    expect(compareValues(2, 2)).toBe(0);
    expect(compareValues('B', 'a')).toBe(-1);
    expect(compareValues('b', 'a')).toBe(1);
    expect(compareValues('a', 'a')).toBe(0);
    expect(compareValues(false, true)).toBe(-1);
    expect(compareValues(new Date(2), new Date(1))).toBe(1);
    expect(compareValues(null, undefined)).toBe(0);
    expect(compareValues([1], [2])).toBe(0);
  });
});

describe('valuesEqual', () => {
  it('compares dates by time and the rest strictly', () => {
    expect(valuesEqual(new Date(1), new Date(1))).toBe(true);
    expect(valuesEqual(new Date(1), 1)).toBe(false);
    expect(valuesEqual('1', 1)).toBe(false);
    expect(valuesEqual(true, true)).toBe(true);
  });
});

describe('isDate', () => {
  it('recognizes dates of this realm and of another one', () => {
    const foreign: unknown = runInNewContext('new Date(5)');
    expect(foreign instanceof Date).toBe(false);
    expect(isDate(new Date(0))).toBe(true);
    expect(isDate(new Date(Number.NaN))).toBe(true);
    expect(isDate(foreign)).toBe(true);
    expect(isDate(structuredClone(new Date(0)))).toBe(true);
    expect(valuesEqual(foreign, new Date(5))).toBe(true);
    expect(compareValues(foreign, new Date(6))).toBe(-1);
  });

  it.each([
    ['null', null],
    ['a number', 0],
    ['ISO text', '2024-01-01'],
    ['an object with getTime', { getTime: () => 0 }],
    ['an object tagged as Date', { [Symbol.toStringTag]: 'Date' }],
    ['an object with the Date prototype', Object.create(Date.prototype)],
  ])('rejects %s', (_name, value) => {
    expect(isDate(value)).toBe(false);
  });
});

describe('compareText', () => {
  const astral = '\u{1F600}';

  it('orders by Unicode code point, as MongoDB and UTF-8 byte order do', () => {
    const halfwidth = '\uFF71';
    expect(halfwidth < astral).toBe(false);
    expect(compareText(halfwidth, astral)).toBe(-1);
    expect(compareText(astral, halfwidth)).toBe(1);
    expect(compareValues(`a${astral}`, `a${halfwidth}`)).toBe(1);
    expect(['\uE000', astral, '\uD7FF', 'z'].sort(compareText)).toEqual([
      'z',
      '\uD7FF',
      '\uE000',
      astral,
    ]);
  });

  it('keeps the binary order below U+D800 and puts a prefix first', () => {
    expect(compareText('B', 'a')).toBe(-1);
    expect(compareText('a', 'Á')).toBe(-1);
    expect(compareText('ab', 'abc')).toBe(-1);
    expect(compareText('abc', 'ab')).toBe(1);
    expect(compareText('same', 'same')).toBe(0);
    expect(compareText(astral, astral)).toBe(0);
  });
});
