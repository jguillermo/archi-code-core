import test from '../testFunctions';

describe('Validators', () => {
  it('should validate ISO 15924 script codes', () => {
    test({
      validator: 'isISO15924',
      valid: ['Adlm', 'Bass', 'Copt', 'Dsrt', 'Egyd', 'Latn', 'Zzzz'],
      invalid: ['', 'arab', 'zzzz', 'Qaby', 'Lati'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isISO15924',
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
