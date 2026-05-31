import test from '../testFunctions';

describe('Validators', () => {
  it('should validate ascii strings', () => {
    test({
      validator: 'isAscii',
      valid: ['foobar', '0987654321', 'test@example.com', '1234abcDEF'],
      invalid: ['ｆｏｏbar', 'ｘｙｚ０９８', '１２３456', 'ｶﾀｶﾅ'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isAscii',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isAscii', valid: [42, true, false, 0] });
  });
});
