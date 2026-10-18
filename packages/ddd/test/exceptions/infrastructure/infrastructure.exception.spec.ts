import { describe, expect, it, vi } from 'vitest';
import { InfrastructureException } from '../../../src/exceptions/infrastructure/infrastructure.exception';
import { AbstractException } from '../../../src/exceptions/abstract.exception';
import { ApplicationException } from '../../../src/exceptions/application/application.exception';

class MailServerUnavailableException extends InfrastructureException {
  constructor(cause: unknown) {
    super('The mail server did not answer', ['MAIL503'], { cause });
  }
}

describe('InfrastructureException', () => {
  it('reports an adapter failure with the code INF000', () => {
    const exception = new InfrastructureException('The cache is not reachable');

    expect(exception).toBeInstanceOf(AbstractException);
    expect(exception.name).toBe('InfrastructureException');
    expect(exception.code).toBe('INF000');
    expect(exception.description).toBe('Infrastructure Exception (INF000)');
  });

  it('lets an adapter throw its own exception keeping the client error as cause', () => {
    const smtpError = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
    const exception = new MailServerUnavailableException(smtpError);

    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception.code).toBe('MAIL503');
    expect(exception.cause).toBe(smtpError);
    expect(exception.description).toBe(
      'Infrastructure Exception (INF000), MailServerUnavailableException (MAIL503)',
    );
  });

  it('is recognized when thrown by the other build, and is not an application exception', async () => {
    vi.resetModules();
    const otherCopy =
      await import('../../../src/exceptions/infrastructure/infrastructure.exception');
    const thrownByOtherCopy = new otherCopy.InfrastructureException('The cache is not reachable');

    expect(thrownByOtherCopy instanceof InfrastructureException).toBe(true);
    expect(thrownByOtherCopy instanceof ApplicationException).toBe(false);
  });
});
