import { loadWithoutNative, WHITESPACE_SAMPLES } from '../cross/support/withoutNative';
import { describeGrowth, isLinear, measureGrowth } from '../cross/support/timing';
import { rtrim } from '../../src/sanitizer/rtrim';
import * as sanitizer from '../../src/sanitizer';
import { test } from '../cross/support/sanitizerTest';

describe('#2 sanitizer blacklist / whitelist / ltrim / rtrim — chars are literal', () => {
  it("'a-c' means the three characters a, - and c (not a range)", () => {
    expect(sanitizer.rtrim('b-a-', 'a-')).toBe('b');
  });
});

describe('Sanitizers', () => {
  it('should trim whitespace', () => {
    test({
      sanitizer: 'rtrim',
      expect: {
        '  \r\n\tfoo  \r\n\t   ': '  \r\n\tfoo',
        ' \r\n  \t': '',
      },
    });
  });

  it('should trim custom characters', () => {
    test({
      sanitizer: 'rtrim',
      args: ['01'],
      expect: { '010100201000': '0101002' },
    });

    test({
      sanitizer: 'rtrim',
      args: ['\\S'],
      expect: { '01010020100001\\S': '01010020100001' },
    });
  });
});

describe('rtrim is linear (no ReDoS)', () => {
  it('long runs of chars not at the end', () => {
    const input = `${'a'.repeat(100_000)}b`;
    expect(sanitizer.rtrim(input, 'a')).toBe(input);
    expect(sanitizer.trim(input, 'a')).toBe('b');
    // Growth, not absolute time: the former regex was ×16 for ×4 input.
    const inputs = new Map<number, string>();
    const growth = measureGrowth((n) => {
      let s = inputs.get(n);
      if (s === undefined) inputs.set(n, (s = `${'a'.repeat(n)}b`));
      sanitizer.rtrim(s, 'a');
    }, 25_000);
    expect(isLinear(growth) || describeGrowth(growth)).toBe(true);
  });
  it('trims surrogate halves per code unit, like the former character class', () => {
    expect(sanitizer.rtrim('x😀', '😀')).toBe('x');
    expect(sanitizer.rtrim('x\uD83D', '😀')).toBe('x');
  });
});

describe('rtrim — native String.prototype.trimEnd when available, programmed fallback otherwise', () => {
  const fallback = loadWithoutNative<{ rtrim: typeof rtrim }>('../../../src/sanitizer/rtrim', [
    'trimEnd',
  ]).rtrim;

  it('the fallback gives exactly the same result as the native path', () => {
    for (const input of WHITESPACE_SAMPLES) {
      expect(fallback(input)).toBe(rtrim(input));
      expect(fallback(input)).toBe(input.trimEnd());
    }
  });

  it('with chars both paths use the programmed rule', () => {
    expect(fallback('--a--', '-')).toBe(rtrim('--a--', '-'));
  });

  it('both paths reject non-strings with a TypeError', () => {
    expect(() => fallback(null as unknown as string)).toThrow(TypeError);
    expect(() => rtrim(null as unknown as string)).toThrow(TypeError);
  });
});
