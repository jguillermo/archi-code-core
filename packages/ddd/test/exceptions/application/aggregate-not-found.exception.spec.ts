import { describe, expect, it, vi } from 'vitest';
import { AggregateNotFoundException } from '../../../src/exceptions/application/aggregate-not-found.exception';
import { ApplicationException } from '../../../src/exceptions/application/application.exception';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { ValidationException } from '../../../src/exceptions/domain/validation.exception';
import { ExceptionCode } from '../../../src/exceptions/exception-code';
import { AbstractException } from '../../../src/exceptions/abstract.exception';

interface User {
  id: string;
  name: string;
}

class InMemoryUserRepository {
  private readonly users = new Map<string, User>([['u-1', { id: 'u-1', name: 'Ana' }]]);

  getById(id: string): User {
    const user = this.users.get(id);
    if (user === undefined) {
      throw new AggregateNotFoundException('User', id);
    }
    return user;
  }
}

function toHttpStatus(error: unknown): number {
  if (!(error instanceof AbstractException)) {
    return 500;
  }
  switch (error.code) {
    case ExceptionCode.AggregateNotFound:
      return 404;
    case ExceptionCode.ValidationFailed:
      return 422;
    default:
      return 400;
  }
}

describe('AggregateNotFoundException', () => {
  it('is what a use case throws when the aggregate it needs does not exist', () => {
    const repository = new InMemoryUserRepository();

    expect(repository.getById('u-1').name).toBe('Ana');
    expect(() => repository.getById('u-404')).toThrow(AggregateNotFoundException);
    expect(() => repository.getById('u-404')).toThrow('User with ID u-404 not found.');
  });

  it('is an application exception with the code APP002, never a domain one', () => {
    const exception = new AggregateNotFoundException('User', 'u-404');

    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception).not.toBeInstanceOf(DomainException);
    expect(exception.name).toBe('AggregateNotFoundException');
    expect(exception.code).toBe('APP002');
    expect(exception.description).toBe(
      'Application Exception (APP000), Aggregate Not Found (APP002)',
    );
  });

  it('lets an HTTP error mapper turn it into a 404 by its code', () => {
    expect(toHttpStatus(new AggregateNotFoundException('User', 'u-404'))).toBe(404);
    expect(
      toHttpStatus(new ValidationException([{ field: null, message: 'Email: invalid' }])),
    ).toBe(422);
    expect(toHttpStatus(new DomainException('Stock cannot be negative'))).toBe(400);
    expect(toHttpStatus(new Error('boom'))).toBe(500);
  });

  it('is recognized when thrown by the other build of the package, and not taken for a validation error', async () => {
    vi.resetModules();
    const otherCopy =
      await import('../../../src/exceptions/application/aggregate-not-found.exception');
    const thrownByOtherCopy = new otherCopy.AggregateNotFoundException('User', 'u-404');

    expect(thrownByOtherCopy instanceof AggregateNotFoundException).toBe(true);
    expect(thrownByOtherCopy instanceof ApplicationException).toBe(true);
    expect(thrownByOtherCopy instanceof ValidationException).toBe(false);
    expect(toHttpStatus(thrownByOtherCopy)).toBe(404);
  });
});
