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
