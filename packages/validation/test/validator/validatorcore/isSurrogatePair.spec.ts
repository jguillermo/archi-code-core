import test from '../testFunctions';

describe('Validators', () => {
  it('should validate surrogate pair strings', () => {
    test({
      validator: 'isSurrogatePair',
      valid: ['𠮷野𠮷', '𩸽', 'ABC千𥧄1-2-3'],
      invalid: ['吉野竈', '鮪', 'ABC1-2-3'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isSurrogatePair',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
