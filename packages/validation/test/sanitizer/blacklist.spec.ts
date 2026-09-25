import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it('special characters never throw', () => {
    expect(sanitizer.blacklist('a\\b]c', '\\]')).toBe('abc');
  });

  it("'a-c' means the three characters a, - and c (not a range)", () => {
    expect(sanitizer.blacklist('abc-d', 'a-c')).toBe('bd');
  });

  it('empty chars are a no-op (blacklist) / remove everything (whitelist)', () => {
    expect(sanitizer.blacklist('abc', '')).toBe('abc');
  });
});

describe('Sanitizers', () => {
  it('should sanitize a string based on a blacklist', () => {
    test({
      sanitizer: 'blacklist',
      args: ['abc'],
      expect: {
        abcdef: 'def',
        aaaaaaaaaabbbbbbbbbb: '',
        a1b2c3: '123',
        '   ': '   ',
      },
    });
  });
});
