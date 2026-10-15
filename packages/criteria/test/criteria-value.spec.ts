import { describe, expect, it } from '@jest/globals';
import { compareValues, valuesEqual } from '../src/criteria-value';

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
