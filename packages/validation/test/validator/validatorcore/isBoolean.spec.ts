import test from '../testFunctions';

describe('Validators', () => {
  it('should validate booleans', () => {
    test({
      validator: 'isBoolean',
      valid: ['true', 'false', '0', '1'],
      invalid: ['1.0', '0.0', 'true ', 'False', 'True', 'yes'],
    });
  });

  it('should validate booleans with option loose set to true', () => {
    test({
      validator: 'isBoolean',
      args: [{ loose: true }],
      valid: [
        'true',
        'True',
        'TRUE',
        'false',
        'False',
        'FALSE',
        '0',
        '1',
        'yes',
        'Yes',
        'YES',
        'no',
        'No',
        'NO',
      ],
      invalid: ['1.0', '0.0', 'true ', ' false'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isBoolean',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
  it('should correctly validate coercible non-string inputs', () => {
    test({ validator: 'isBoolean', valid: [true, false, 1, 0] });
    test({ validator: 'isBoolean', invalid: [42, -1] });
  });
});
