import { describe, expect, it } from '@jest/globals';
import { invalid, valid, check } from './helpers';

describe('isInteger', () => {
  it('valid — string integer', () => valid('42', 'isInteger'));
  it('valid — negative string', () => valid('-10', 'isInteger'));
  it('valid — zero string', () => valid('0', 'isInteger'));
  it('valid — number value converted to string', () => valid(42, 'isInteger'));
  it('valid — negative number', () => valid(-5, 'isInteger'));
  it('invalid — float string', () => invalid('3.14', 'isInteger'));
  it('invalid — float number', () => invalid(3.14, 'isInteger'));
  it('invalid — string with letters', () => invalid('abc', 'isInteger'));
  it('invalid — empty string', () => invalid('', 'isInteger'));
  it('invalid — null coerced to ""', () => invalid(null, 'isInteger'));
  it('invalid — object coerced to ""', () => invalid({}, 'isInteger'));
  it('invalid — array coerced to ""', () => invalid([], 'isInteger'));
  it('invalid — boolean true coerced to "true"', () => invalid(true, 'isInteger'));
  it('invalid — boolean false coerced to "false"', () => invalid(false, 'isInteger'));
});

describe('isPositiveInteger', () => {
  it('valid — positive string', () => valid('5', 'isPositiveInteger'));
  it('valid — positive number', () => valid(1, 'isPositiveInteger'));
  it('valid — large number', () => valid(999999, 'isPositiveInteger'));
  it('invalid — zero string', () => invalid('0', 'isPositiveInteger'));
  it('invalid — zero number', () => invalid(0, 'isPositiveInteger'));
  it('invalid — negative string', () => invalid('-1', 'isPositiveInteger'));
  it('invalid — negative number', () => invalid(-5, 'isPositiveInteger'));
  it('invalid — float', () => invalid('1.5', 'isPositiveInteger'));
  it('invalid — empty string', () => invalid('', 'isPositiveInteger'));
  it('invalid — null coerced to ""', () => invalid(null, 'isPositiveInteger'));
});

describe('isNegativeInteger', () => {
  it('valid — negative string', () => valid('-5', 'isNegativeInteger'));
  it('valid — negative number', () => valid(-1, 'isNegativeInteger'));
  it('valid — large negative', () => valid(-999999, 'isNegativeInteger'));
  it('invalid — zero string', () => invalid('0', 'isNegativeInteger'));
  it('invalid — zero number', () => invalid(0, 'isNegativeInteger'));
  it('invalid — positive string', () => invalid('1', 'isNegativeInteger'));
  it('invalid — positive number', () => invalid(5, 'isNegativeInteger'));
  it('invalid — float', () => invalid('-1.5', 'isNegativeInteger'));
  it('invalid — empty string', () => invalid('', 'isNegativeInteger'));
  it('invalid — null coerced to ""', () => invalid(null, 'isNegativeInteger'));
});

describe('isFloat', () => {
  it('valid — float string', () => valid('3.14', 'isFloat'));
  it('valid — integer string (also valid f64)', () => valid('42', 'isFloat'));
  it('valid — negative float string', () => valid('-1.5', 'isFloat'));
  it('valid — float number', () => valid(3.14, 'isFloat'));
  it('valid — integer number', () => valid(42, 'isFloat'));
  it('invalid — string with letters', () => invalid('abc', 'isFloat'));
  it('invalid — empty string', () => invalid('', 'isFloat'));
  it('invalid — null coerced to ""', () => invalid(null, 'isFloat'));
  it('invalid — object coerced to ""', () => invalid({}, 'isFloat'));
  it('invalid — boolean coerced to "true"', () => invalid(true, 'isFloat'));
  it('invalid — array coerced to ""', () => invalid([], 'isFloat'));
});

describe('isPositiveNumber', () => {
  it('valid — positive float', () => valid(3.14, 'isPositiveNumber'));
  it('valid — positive integer', () => valid(1, 'isPositiveNumber'));
  it('valid — very small positive', () => valid(0.0001, 'isPositiveNumber'));
  it('invalid — zero', () => invalid(0, 'isPositiveNumber'));
  it('invalid — negative float', () => invalid(-0.5, 'isPositiveNumber'));
  it('invalid — negative integer', () => invalid(-1, 'isPositiveNumber'));
  // string numbers are parsed to f64
  it('valid — string "5" parsed to 5.0', () => valid('5', 'isPositiveNumber'));
  it('invalid — string "0" parsed to 0.0', () => invalid('0', 'isPositiveNumber'));
  it('invalid — string "abc" parsed to 0.0 (not positive)', () =>
    invalid('abc', 'isPositiveNumber'));
  // null → 0.0 → not positive
  it('invalid — null coerced to 0.0', () => invalid(null, 'isPositiveNumber'));
  it('invalid — object coerced to 0.0', () => invalid({}, 'isPositiveNumber'));
});

describe('isNegativeNumber', () => {
  it('valid — negative float', () => valid(-0.5, 'isNegativeNumber'));
  it('valid — negative integer', () => valid(-10, 'isNegativeNumber'));
  it('invalid — zero', () => invalid(0, 'isNegativeNumber'));
  it('invalid — positive float', () => invalid(0.1, 'isNegativeNumber'));
  it('invalid — positive integer', () => invalid(1, 'isNegativeNumber'));
  // string numbers are parsed to f64
  it('invalid — string "5" parsed to 5.0', () => invalid('5', 'isNegativeNumber'));
  it('valid — string "-3" parsed to -3.0', () => valid('-3', 'isNegativeNumber'));
  // null → 0.0 → not negative
  it('invalid — null coerced to 0.0', () => invalid(null, 'isNegativeNumber'));
});

describe('isInRange', () => {
  it('valid — value within range', () => valid(5, ['isInRange', 1, 10]));
  it('valid — at min boundary', () => valid(1, ['isInRange', 1, 10]));
  it('valid — at max boundary', () => valid(10, ['isInRange', 1, 10]));
  it('valid — float within range', () => valid(5.5, ['isInRange', 1, 10]));
  it('valid — string number parsed', () => valid('5', ['isInRange', 1, 10]));
  it('invalid — one below min', () => invalid(0, ['isInRange', 1, 10]));
  it('invalid — one above max', () => invalid(11, ['isInRange', 1, 10]));
  it('invalid — negative range', () => valid(-5, ['isInRange', -10, -1]));
  it('invalid — string letters → 0.0 outside range [1,10]', () =>
    invalid('abc', ['isInRange', 1, 10]));
  it('invalid — null → 0.0 outside range [1,10]', () => invalid(null, ['isInRange', 1, 10]));
  it('failure returns isInRange code (21)', () => {
    const errors = check(200, ['isInRange', 0, 100]);
    expect(errors[0]).toBe(21);
  });
});

describe('isMinValue', () => {
  it('valid — above min', () => valid(10, ['isMinValue', 5]));
  it('valid — exactly at min', () => valid(5, ['isMinValue', 5]));
  it('valid — string number parsed', () => valid('10', ['isMinValue', 5]));
  it('invalid — below min', () => invalid(4, ['isMinValue', 5]));
  it('invalid — negative below positive min', () => invalid(-1, ['isMinValue', 0]));
  // null → 0.0 → passes min 0 but fails min 1
  it('valid — null → 0.0 passes min 0', () => valid(null, ['isMinValue', 0]));
  it('invalid — null → 0.0 fails min 1', () => invalid(null, ['isMinValue', 1]));
});

describe('isMaxValue', () => {
  it('valid — below max', () => valid(4, ['isMaxValue', 5]));
  it('valid — exactly at max', () => valid(5, ['isMaxValue', 5]));
  it('valid — string number parsed', () => valid('4', ['isMaxValue', 5]));
  it('invalid — above max', () => invalid(6, ['isMaxValue', 5]));
  it('invalid — large number', () => invalid(1000, ['isMaxValue', 100]));
  // null → 0.0 → passes any non-negative max
  it('valid — null → 0.0 passes max 100', () => valid(null, ['isMaxValue', 100]));
  it('invalid — null → 0.0 fails max -1', () => invalid(null, ['isMaxValue', -1]));
});

describe('isMultipleOf', () => {
  it('valid — multiple of 2', () => valid(10, ['isMultipleOf', 2]));
  it('valid — multiple of 1 (any integer)', () => valid(7, ['isMultipleOf', 1]));
  // float arithmetic has precision issues: 0.6 % 0.2 ≈ 0.19999... > EPSILON → fails
  it('invalid — float precision: 0.6 % 0.2 ≠ 0 due to IEEE 754', () =>
    invalid(0.6, ['isMultipleOf', 0.2]));
  it('invalid — not a multiple', () => invalid(7, ['isMultipleOf', 3]));
  it('invalid — zero divisor', () => invalid(10, ['isMultipleOf', 0]));
  it('valid — string number parsed', () => valid('10', ['isMultipleOf', 5]));
  // null → 0.0 → 0 % n = 0 for any non-zero n
  it('valid — null → 0.0 (0 is multiple of any non-zero)', () => valid(null, ['isMultipleOf', 2]));
});
