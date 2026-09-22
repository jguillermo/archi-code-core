import test from '../testFunctions';

describe('Validators', () => {
  it('should validate variable-width strings', () => {
    test({
      validator: 'isVariableWidth',
      valid: ['ひらがなカタカナ漢字ABCDE', '３ー０123', 'Ｆｶﾀｶﾅﾞﾬ', 'Good＝Parts'],
      invalid: [
        'abc',
        'abc123',
        '!"#$%&()<>/+=-_? ~^|.,@`{}[]',
        'ひらがな・カタカナ、．漢字',
        '１２３４５６',
        'ｶﾀｶﾅﾞﾬ',
      ],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isVariableWidth',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
