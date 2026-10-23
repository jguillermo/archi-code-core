import { describe, expect, it, vi } from 'vitest';
import { UnexpectedErrorException } from '../../../src/application/exceptions/unexpected-error.exception';
import { ApplicationException } from '../../../src/application/exceptions/application.exception';

describe('UnexpectedErrorException', () => {
  it('wraps an error nobody expected while placing an order, keeping it as cause for the logs', () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'lines')");
    const exception = new UnexpectedErrorException(`PlaceOrder: ${bug.message}`, { cause: bug });

    expect(exception).toMatchObject({
      message:
        "Failed, unexpected error: PlaceOrder: Cannot read properties of undefined (reading 'lines')",
      code: 'APP004',
      cause: bug,
    });
  });

  it('is an application exception with the code APP004', () => {
    const exception = new UnexpectedErrorException('PlaceOrder: boom');

    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception.description).toBe('Application Exception (APP000), Unexpected Error (APP004)');
    expect('cause' in exception).toBe(false);
  });

  it('is recognized when thrown by the other build, also as an application exception', async () => {
    vi.resetModules();
    const otherCopy =
      await import('../../../src/application/exceptions/unexpected-error.exception');
    const thrownByOtherCopy = new otherCopy.UnexpectedErrorException('PlaceOrder: boom');

    expect(thrownByOtherCopy instanceof UnexpectedErrorException).toBe(true);
    expect(thrownByOtherCopy instanceof ApplicationException).toBe(true);
    expect(new ApplicationException('x') instanceof otherCopy.UnexpectedErrorException).toBe(false);
  });
});
