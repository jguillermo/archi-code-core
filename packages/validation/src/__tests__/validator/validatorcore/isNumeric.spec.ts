import test from '../testFunctions';

describe('Validators', () => {
  it('should validate numeric strings', () => {
    test({
      validator: 'isNumeric',
      valid: ['123', '00123', '-00123', '0', '-0', '+123', '123.123', '+000000'],
      invalid: [' ', '', '.'],
    });
  });

  it('should validate numeric strings without symbols', () => {
    test({
      validator: 'isNumeric',
      args: [
        {
          no_symbols: true,
        },
      ],
      valid: ['123', '00123', '0'],
      invalid: ['-0', '+000000', '', '+123', '123.123', '-00123', ' ', '.'],
    });
  });

  it('should validate numeric strings with locale', () => {
    test({
      validator: 'isNumeric',
      args: [
        {
          locale: 'fr-FR',
        },
      ],
      valid: ['123', '00123', '-00123', '0', '-0', '+123', '123,123', '+000000'],
      invalid: [' ', '', ','],
    });
  });

  it('should validate numeric strings with locale', () => {
    test({
      validator: 'isNumeric',
      args: [
        {
          locale: 'fr-CA',
        },
      ],
      valid: ['123', '00123', '-00123', '0', '-0', '+123', '123,123', '+000000'],
      invalid: [' ', '', '.'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isNumeric',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isNumeric', valid: [42, 0, 3.14, -7] });
    test({ validator: 'isNumeric', invalid: [true, false] });
  });
});
