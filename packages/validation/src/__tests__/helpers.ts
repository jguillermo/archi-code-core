import { expect } from '@jest/globals';
import { createValidator } from '../validators/validate';
import type { ValidationRule } from '../validators/validate';

/** Run validations on a single value and return its failing rule codes. */
export const check = (value: unknown, ...rules: ValidationRule[]): number[] => {
  const validator = createValidator([{ field: 'f', validations: rules }]);
  return validator.validate({ f: value }).errors['f'];
};

/** Assert the value passes all given rules. */
export const valid = (value: unknown, ...rules: ValidationRule[]): void =>
  expect(check(value, ...rules)).toEqual([]);

/** Assert the value fails at least one of the given rules. */
export const invalid = (value: unknown, ...rules: ValidationRule[]): void =>
  expect(check(value, ...rules).length).toBeGreaterThan(0);
