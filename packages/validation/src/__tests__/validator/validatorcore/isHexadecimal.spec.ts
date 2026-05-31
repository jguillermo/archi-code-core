import test from '../testFunctions';

describe('Validators', () => {
  it('should validate hexadecimal strings', () => {
    test({
      validator: 'isHexadecimal',
      valid: [
        'deadBEEF',
        'ff0044',
        '0xff0044',
        '0XfF0044',
        '0x0123456789abcDEF',
        '0X0123456789abcDEF',
        '0hfedCBA9876543210',
        '0HfedCBA9876543210',
        '0123456789abcDEF',
      ],
      invalid: [
        'abcdefg',
        '',
        '..',
        '0xa2h',
        '0xa20x',
        '0x0123456789abcDEFq',
        '0hfedCBA9876543210q',
        '01234q56789abcDEF',
      ],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isHexadecimal',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isHexadecimal', valid: [255, 0] });
    test({ validator: 'isHexadecimal', invalid: [true, false] });
  });
});
