import test from '../testFunctions';

describe('Validators', () => {
  it('should validate uppercase strings', () => {
    test({
      validator: 'isUppercase',
      valid: ['ABC', 'ABC123', 'ALL CAPS IS FUN.', '   .'],
      invalid: ['fooBar', '123abc'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isUppercase',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isUppercase', valid: [42] });
    test({ validator: 'isUppercase', invalid: [true, false] });
  });
});
