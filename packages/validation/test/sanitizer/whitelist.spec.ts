import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it('special characters never throw', () => {
    expect(sanitizer.whitelist('a\\b]c', '\\]')).toBe('\\]');
  });

  it("'a-c' means the three characters a, - and c (not a range)", () => {
    expect(sanitizer.whitelist('abc-d', 'a-c')).toBe('ac-');
  });

  it('empty chars are a no-op (blacklist) / remove everything (whitelist)', () => {
    expect(sanitizer.whitelist('abc', '')).toBe('');
  });
});

describe('Sanitizers', () => {
  it('should sanitize a string based on a whitelist', () => {
    test({
      sanitizer: 'whitelist',
      args: ['abc'],
      expect: {
        abcdef: 'abc',
        aaaaaaaaaabbbbbbbbbb: 'aaaaaaaaaabbbbbbbbbb',
        a1b2c3: 'abc',
        '   ': '',
      },
    });
  });
});
