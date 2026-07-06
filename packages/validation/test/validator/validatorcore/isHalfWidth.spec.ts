import test from '../testFunctions';

describe('Validators', () => {
  it('should validate half-width strings', () => {
    test({
      validator: 'isHalfWidth',
      valid: ['!"#$%&()<>/+=-_? ~^|.,@`{}[]', 'l-btn_02--active', 'abc123い', 'ｶﾀｶﾅﾞﾬ￩'],
      invalid: ['あいうえお', '００１１'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isHalfWidth',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
