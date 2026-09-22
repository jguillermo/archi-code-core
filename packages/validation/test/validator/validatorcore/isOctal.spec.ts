import test from '../testFunctions';

describe('Validators', () => {
  it('should validate octal strings', () => {
    test({
      validator: 'isOctal',
      valid: ['076543210', '0o01234567'],
      invalid: ['abcdefg', '012345678', '012345670c', '00c12345670c', '', '..'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isOctal',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isOctal', valid: [7, 0] });
    test({ validator: 'isOctal', invalid: [8, true] });
  });
});
