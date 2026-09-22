import test from '../testFunctions';

describe('Validators', () => {
  it('should validate multibyte strings', () => {
    test({
      validator: 'isMultibyte',
      valid: [
        'ひらがな・カタカナ、．漢字',
        'あいうえお foobar',
        'test＠example.com',
        '1234abcDEｘｙｚ',
        'ｶﾀｶﾅ',
        '中文',
      ],
      invalid: ['abc', 'abc123', '<>@" *.'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isMultibyte',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
