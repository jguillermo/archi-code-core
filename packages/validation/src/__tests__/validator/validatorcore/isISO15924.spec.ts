import test from '../testFunctions';

describe('Validators', () => {
  it('should validate ISO 15924 script codes', () => {
    test({
      validator: 'isISO15924',
      valid: ['Adlm', 'Bass', 'Copt', 'Dsrt', 'Egyd', 'Latn', 'Zzzz'],
      invalid: ['', 'arab', 'zzzz', 'Qaby', 'Lati'],
    });
  });
});
