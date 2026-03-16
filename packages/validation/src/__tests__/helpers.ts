import { expect } from '@jest/globals';
import { validate } from '../validators/validate';

type Rules = Parameters<typeof validate>[0]['fields'][0]['validations'];

/** Run validations on a single value and return its failing rule codes. */
export const check = (value: unknown, ...rules: Rules): number[] =>
  validate({ fields: [{ field: 'f', value, validations: rules }] }).errors['f'];

/** Assert the value passes all given rules. */
export const valid = (value: unknown, ...rules: Rules): void =>
  expect(check(value, ...rules)).toEqual([]);

/** Assert the value fails at least one of the given rules. */
export const invalid = (value: unknown, ...rules: Rules): void =>
  expect(check(value, ...rules).length).toBeGreaterThan(0);
