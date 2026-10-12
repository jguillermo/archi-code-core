import { describe, it, expect } from '@jest/globals';
import { IsNotEmptyCompare } from '../../src/compare-process/is-not-empty.compare';

describe('IsNotEmptyCompare', () => {
  const compare = new IsNotEmptyCompare();

  it('matches the IS_NOT_EMPTY() marker', () => {
    expect('IS_NOT_EMPTY()'.search(compare.regexp)).toBe(0);
  });

  it('accepts a non-empty value', () => {
    expect(compare.compare('value')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(compare.compare('')).toBe(false);
  });
});
