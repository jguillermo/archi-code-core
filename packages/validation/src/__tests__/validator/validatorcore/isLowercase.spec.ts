import test from '../testFunctions';

describe('Validators', () => {
  it('should validate lowercase strings', () => {
    test({
      validator: 'isLowercase',
      valid: ['abc', 'abc123', 'this is lowercase.', 'tr竪s 端ber'],
      invalid: ['fooBar', '123A'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isLowercase',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isLowercase', valid: [true, false, 42, 0] });
  });
});
