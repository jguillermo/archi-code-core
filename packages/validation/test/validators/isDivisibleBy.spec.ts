import test from '../cross/support/testFunctions';
import { validator } from '../../src/validators';

describe('Validators', () => {
  it('should validate that integer strings are divisible by a number', () => {
    test({
      validator: 'isDivisibleBy',
      args: [2],
      valid: ['2', '4', '100', '1000'],
      invalid: ['1', '2.5', '101', 'foo', '', '2020-01-06T14:31:00.135Z'],
    });
  });

  it('should return false for non-string inputs', () => {
    test({
      validator: 'isDivisibleBy',
      args: [3],
      invalid: [null, undefined, NaN, Infinity, -Infinity, {}, [], [1, 2, 3]],
    });
  });
});

describe('#13 isDivisibleBy — decimal notation only', () => {
  it('hex/binary literals are not numbers here', () => {
    expect(validator.isDivisibleBy('0x10', 2)).toBe(false);
    expect(validator.isDivisibleBy('0b100', 2)).toBe(false);
    expect(validator.isDivisibleBy('16', 2)).toBe(true);
  });
});
