import { describe, expect, it, vi } from 'vitest';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { AggregateNotFoundException } from '../../../src/exceptions/domain/aggregate-not-found.exception';

describe('ValidationException', () => {
  it('collects every failed rule of a form in one message', () => {
    const exception = new ValidationException([
      'Email: Value does not satisfy isEmail',
      'Age: Value does not satisfy isInt',
    ]);

    expect(exception.message).toBe(
      'Validation failed, Email: Value does not satisfy isEmail, Age: Value does not satisfy isInt',
    );
    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.code).toBe('DOM001');
    expect(exception.description).toBe('Domain Exception (DOM000), Validation Failed (DOM001)');
  });

  it('keeps the list of errors so an API can return them field by field', () => {
    const exception = new ValidationException(['Email: invalid', 'Age: invalid']);

    expect(exception.errors).toStrictEqual(['Email: invalid', 'Age: invalid']);
  });

  it('keeps a frozen copy of the errors that the caller cannot change afterwards', () => {
    const errors = ['Email: invalid'];
    const exception = new ValidationException(errors);
    errors.push('Age: invalid');

    expect(exception.errors).toStrictEqual(['Email: invalid']);
    expect(Object.isFrozen(exception.errors)).toBe(true);
    expect(() => (exception.errors as string[]).push('Name: invalid')).toThrow(TypeError);
  });

  it('is recognized when thrown by the other build, but not taken for a sibling exception', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/domain/validation.exception');
    const thrownByOtherCopy = new otherCopy.ValidationException(['Email: invalid']);

    expect(thrownByOtherCopy instanceof ValidationException).toBe(true);
    expect(thrownByOtherCopy instanceof AggregateNotFoundException).toBe(false);
    expect(
      new AggregateNotFoundException('User', 'u-1') instanceof otherCopy.ValidationException,
    ).toBe(false);
  });
});
