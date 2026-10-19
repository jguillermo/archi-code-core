import { describe, expect, it, vi } from 'vitest';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { AggregateNotFoundException } from '../../../src/exceptions/application/aggregate-not-found.exception';

describe('ValidationException', () => {
  it('collects every failed rule of a form in one message, naming the field when there is one', () => {
    const exception = new ValidationException([
      { field: 'email', message: 'Email: Value does not satisfy isEmail' },
      { field: null, message: 'Age: Value does not satisfy isInt' },
    ]);

    expect(exception.message).toBe(
      'Validation failed, email: Email: Value does not satisfy isEmail, Age: Value does not satisfy isInt',
    );
    expect(exception).toBeInstanceOf(DomainException);
    expect(exception.code).toBe('DOM001');
    expect(exception.description).toBe('Domain Exception (DOM000), Validation Failed (DOM001)');
  });

  it('keeps the list of errors so an API can return them field by field', () => {
    const exception = new ValidationException([
      { field: 'email', message: 'Email: invalid' },
      { field: 'lines.1.units', message: 'Units: invalid' },
    ]);

    expect(exception.errors).toStrictEqual([
      { field: 'email', message: 'Email: invalid' },
      { field: 'lines.1.units', message: 'Units: invalid' },
    ]);
  });

  it('keeps a frozen copy of the errors that the caller cannot change afterwards', () => {
    const issue = { field: 'email', message: 'Email: invalid' };
    const errors = [issue];
    const exception = new ValidationException(errors);
    errors.push({ field: 'age', message: 'Age: invalid' });
    issue.message = 'changed';

    expect(exception.errors).toStrictEqual([{ field: 'email', message: 'Email: invalid' }]);
    expect(Object.isFrozen(exception.errors)).toBe(true);
    expect(Object.isFrozen(exception.errors[0])).toBe(true);
    expect(() =>
      (exception.errors as { field: string | null; message: string }[]).push({
        field: null,
        message: 'Name: invalid',
      }),
    ).toThrow(TypeError);
  });

  it('is recognized when thrown by the other build, but not taken for a sibling exception', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/domain/validation.exception');
    const thrownByOtherCopy = new otherCopy.ValidationException([
      { field: 'email', message: 'Email: invalid' },
    ]);

    expect(thrownByOtherCopy instanceof ValidationException).toBe(true);
    expect(thrownByOtherCopy instanceof AggregateNotFoundException).toBe(false);
    expect(
      new AggregateNotFoundException('User', 'u-1') instanceof otherCopy.ValidationException,
    ).toBe(false);
  });
});
