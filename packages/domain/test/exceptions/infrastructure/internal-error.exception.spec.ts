import { describe, expect, it, vi } from 'vitest';
import { InternalErrorException } from '../../../src/exceptions/infrastructure/internal-error.exception';
import { InfrastructureException } from '../../../src/exceptions/infrastructure/infrastructure.exception';

class DriverError extends Error {
  constructor(readonly errorCode: number) {
    super('E11000 duplicate key error');
  }
}

class UserRepository {
  constructor(private readonly insert: (document: object) => void) {}

  save(document: object): void {
    try {
      this.insert(document);
    } catch (error) {
      throw new InternalErrorException('could not save the user', { cause: error });
    }
  }
}

describe('InternalErrorException', () => {
  it('lets a repository wrap a driver error, keeping it as cause for the logs', () => {
    const driverError = new DriverError(11000);
    const repository = new UserRepository(() => {
      throw driverError;
    });

    let thrown: unknown;
    try {
      repository.save({ id: 'u-1' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(InternalErrorException);
    expect(thrown).toMatchObject({
      message: 'Failed, internal error: could not save the user',
      code: 'INF001',
      cause: driverError,
    });
  });

  it('is an infrastructure exception with the code INF001', () => {
    const exception = new InternalErrorException('disk full');

    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception.code).toBe('INF001');
    expect(exception.description).toBe(
      'Infrastructure Exception (INF000), Internal Error (INF001)',
    );
    expect('cause' in exception).toBe(false);
  });

  it('is recognized when thrown by the other build, also as an infrastructure exception', async () => {
    vi.resetModules();
    const otherCopy =
      await import('../../../src/exceptions/infrastructure/internal-error.exception');
    const thrownByOtherCopy = new otherCopy.InternalErrorException('disk full');

    expect(thrownByOtherCopy instanceof InternalErrorException).toBe(true);
    expect(thrownByOtherCopy instanceof InfrastructureException).toBe(true);
    expect(new InfrastructureException('x') instanceof otherCopy.InternalErrorException).toBe(
      false,
    );
  });
});
