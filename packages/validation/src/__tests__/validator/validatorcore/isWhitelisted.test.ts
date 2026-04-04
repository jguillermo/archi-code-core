import test from '../testFunctions';

describe('Validators', () => {
  it('should validate whitelisted characters', () => {
    test({
      validator: 'isWhitelisted',
      args: ['abcdefghijklmnopqrstuvwxyz-'],
      valid: ['foo', 'foobar', 'baz-foo'],
      invalid: ['foo bar', 'fo.bar', 'türkçe'],
    });
  });

  it('should error on non-string input', () => {
    test({
      validator: 'isEmpty',
      error: [undefined, null, [], NaN],
    });
  });
});
