import { describe, it, expect } from '@jest/globals';
import { IsTimeCompare } from '../../src/compare-process/is-time.compare';

describe('IsTimeCompare', () => {
  const compare = new IsTimeCompare();

  it('matches the IS_TIME() marker', () => {
    expect('IS_TIME()'.search(compare.regexp)).toBe(0);
  });

  it('accepts an ISO 8601 UTC timestamp with milliseconds', () => {
    expect(compare.compare('2024-01-31T10:20:30.123Z')).toBe(true);
  });

  it('rejects a value that is not a timestamp', () => {
    expect(compare.compare('2024-01-31')).toBe(false);
  });
});
