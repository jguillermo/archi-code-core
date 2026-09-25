import { loadWithoutNative, WHITESPACE_SAMPLES } from '../cross/support/withoutNative';
import { ltrim } from '../../src/sanitizer/ltrim';
import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it("'a-c' means the three characters a, - and c (not a range)", () => {
    expect(sanitizer.ltrim('-a-b', 'a-')).toBe('b');
  });
});

describe('Sanitizers', () => {
  it('should trim whitespace', () => {
    test({
      sanitizer: 'ltrim',
      expect: {
        '  \r\n\tfoo  \r\n\t   ': 'foo  \r\n\t   ',
        '   \t  \n': '',
      },
    });
  });

  it('should trim custom characters', () => {
    test({
      sanitizer: 'ltrim',
      args: ['01'],
      expect: { '010100201000': '201000' },
    });

    test({
      sanitizer: 'ltrim',
      args: ['\\S'],
      expect: { '\\S01010020100001': '01010020100001' },
    });
  });
});

describe('ltrim — native String.prototype.trimStart when available, programmed fallback otherwise', () => {
  const fallback = loadWithoutNative<{ ltrim: typeof ltrim }>('../../../src/sanitizer/ltrim', [
    'trimStart',
  ]).ltrim;

  it('the fallback gives exactly the same result as the native path', () => {
    for (const input of WHITESPACE_SAMPLES) {
      expect(fallback(input)).toBe(ltrim(input));
      expect(fallback(input)).toBe(input.trimStart());
    }
  });

  it('with chars both paths use the programmed rule', () => {
    expect(fallback('--a--', '-')).toBe(ltrim('--a--', '-'));
  });

  it('both paths reject non-strings with a TypeError', () => {
    expect(() => fallback(null as unknown as string)).toThrow(TypeError);
    expect(() => ltrim(null as unknown as string)).toThrow(TypeError);
  });
});
