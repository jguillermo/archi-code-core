import test from '../testFunctions';

describe('Validators', () => {
  it('should validate strings against an expected value', () => {
    test({
      validator: 'equals',
      args: ['abc'],
      valid: ['abc'],
      invalid: ['Abc', '123'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'equals',
      args: ['x'],
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});
