import { loadWithoutNative, WHITESPACE_SAMPLES } from '../cross/support/withoutNative';
import { trim } from '../../src/sanitizer/trim';
import { test } from '../cross/support/sanitizerTest';

describe('Sanitizers', () => {
  it('should trim whitespace', () => {
    test({
      sanitizer: 'trim',
      expect: {
        '  \r\n\tfoo  \r\n\t   ': 'foo',
        '      \r': '',
      },
    });
  });

  it('should trim custom characters', () => {
    test({
      sanitizer: 'trim',
      args: ['01'],
      expect: { '010100201000': '2' },
    });
  });
});

describe('trim — native String.prototype.trim when available, programmed fallback otherwise', () => {
  const fallback = loadWithoutNative<{ trim: typeof trim }>('../../../src/sanitizer/trim', [
    'trim',
    'trimStart',
    'trimEnd',
  ]).trim;

  it('the fallback gives exactly the same result as the native path', () => {
    for (const input of WHITESPACE_SAMPLES) {
      expect(fallback(input)).toBe(trim(input));
      expect(fallback(input)).toBe(input.trim());
    }
  });

  it('with chars both paths use the programmed rule', () => {
    expect(fallback('--a--', '-')).toBe(trim('--a--', '-'));
  });

  it('both paths reject non-strings with a TypeError', () => {
    expect(() => fallback(null as unknown as string)).toThrow(TypeError);
    expect(() => trim(null as unknown as string)).toThrow(TypeError);
  });
});
