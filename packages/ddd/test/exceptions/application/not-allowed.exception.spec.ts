import { describe, expect, it, vi } from 'vitest';
import { NotAllowedException } from '../../../src/exceptions/application/not-allowed.exception';
import { ApplicationException } from '../../../src/exceptions/application/application.exception';
import { AggregateNotFoundException } from '../../../src/exceptions/application/aggregate-not-found.exception';

interface Requester {
  readonly customerId: string;
  readonly role: 'customer' | 'support';
}

class SalesAccessPolicy {
  assertCanCancel(requester: Requester, orderOwner: string): void {
    if (requester.role !== 'support' && requester.customerId !== orderOwner) {
      throw new NotAllowedException(
        `${requester.customerId} cannot cancel an order of another customer`,
      );
    }
  }
}

describe('NotAllowedException', () => {
  it('is what a use case throws when the requester may not run the action', () => {
    const policy = new SalesAccessPolicy();
    expect(() =>
      policy.assertCanCancel({ customerId: 'cus-ana', role: 'customer' }, 'cus-ana'),
    ).not.toThrow();
    expect(() =>
      policy.assertCanCancel({ customerId: 'cus-eva', role: 'support' }, 'cus-ana'),
    ).not.toThrow();
    expect(() =>
      policy.assertCanCancel({ customerId: 'cus-luis', role: 'customer' }, 'cus-ana'),
    ).toThrow('cus-luis cannot cancel an order of another customer');
  });

  it('is an application exception with the code APP003', () => {
    const exception = new NotAllowedException('cus-luis cannot cancel this order');
    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception.code).toBe('APP003');
    expect(exception.description).toBe('Application Exception (APP000), Not Allowed (APP003)');
  });

  it('is recognized when thrown by the other build, but not taken for a sibling exception', async () => {
    vi.resetModules();
    const otherCopy = await import('../../../src/exceptions/application/not-allowed.exception');
    const thrownByOtherCopy = new otherCopy.NotAllowedException(
      'cus-luis cannot cancel this order',
    );
    expect(thrownByOtherCopy instanceof NotAllowedException).toBe(true);
    expect(thrownByOtherCopy instanceof AggregateNotFoundException).toBe(false);
  });
});
