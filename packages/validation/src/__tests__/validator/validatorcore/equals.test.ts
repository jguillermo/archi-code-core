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
});
