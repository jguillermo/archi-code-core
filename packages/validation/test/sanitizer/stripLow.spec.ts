import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it('stripLow keeps working without relying on regex ranges in blacklist', () => {
    expect(sanitizer.stripLow('a\u0000b\nc\u007f')).toBe('abc');
    expect(sanitizer.stripLow('a\u0000b\nc\r', true)).toBe('ab\nc\r');
  });
});

describe('Sanitizers', () => {
  it('should remove control characters (<32 and 127)', () => {
    // Check basic functionality
    test({
      sanitizer: 'stripLow',
      expect: {
        'foo\x00': 'foo',
        '\x7Ffoo\x02': 'foo',
        '\x01\x09': '',
        'foo\x0A\x0D': 'foo',
      },
    });

    // Unicode safety
    test({
      sanitizer: 'stripLow',
      expect: {
        perché: 'perch\u00e9',
        '\u20ac': '\u20ac',
        '\u2206\x0A': '\u2206',
        '\ud83d\ude04': '\ud83d\ude04',
      },
    });

    // Preserve newlines
    test({
      sanitizer: 'stripLow',
      args: [true], // keep_new_lines
      expect: {
        'foo\x0A\x0D': 'foo\x0A\x0D',
        '\x03foo\x0A\x0D': 'foo\x0A\x0D',
      },
    });
  });
});
