import test from '../cross/support/testFunctions';

describe('Validators', () => {
  it('should validate strings against a pattern', () => {
    test({
      validator: 'matches',
      args: [{ pattern: /abc/ }],
      valid: ['abc', 'abcdef', '123abc'],
      invalid: ['acb', 'Abc'],
    });
    test({
      validator: 'matches',
      args: [{ pattern: 'abc' }],
      valid: ['abc', 'abcdef', '123abc'],
      invalid: ['acb', 'Abc'],
    });
    test({
      validator: 'matches',
      args: [{ pattern: 'abc', modifiers: 'i' }],
      valid: ['abc', 'abcdef', '123abc', 'AbC'],
      invalid: ['acb'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'matches',
      args: [{ pattern: /x/ }],
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
