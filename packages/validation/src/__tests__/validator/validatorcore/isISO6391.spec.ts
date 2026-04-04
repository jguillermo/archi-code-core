import test from '../testFunctions';

describe('Validators', () => {
  it('should validate ISO 639-1 language codes', () => {
    test({
      validator: 'isISO6391',
      valid: ['ay', 'az', 'ba', 'be', 'bg'],
      invalid: ['aj', 'al', 'pe', 'pf', 'abc', '123', ''],
    });
  });
});
