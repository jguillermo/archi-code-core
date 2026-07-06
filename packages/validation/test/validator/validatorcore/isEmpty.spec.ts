import test from '../testFunctions';

describe('Validators', () => {
  it('should validate null strings', () => {
    test({
      validator: 'isEmpty',
      valid: [''],
      invalid: [' ', 'foo', '3'],
    });
    test({
      validator: 'isEmpty',
      args: [{ ignore_whitespace: false }],
      valid: [''],
      invalid: [' ', 'foo', '3'],
    });
    test({
      validator: 'isEmpty',
      args: [{ ignore_whitespace: true }],
      valid: ['', ' '],
      invalid: ['foo', '3'],
    });
  });

  it('should return false for non-string input instead of throwing', () => {
    test({
      validator: 'isEmpty',
      invalid: [undefined, null, [], NaN],
    });
  });
});
