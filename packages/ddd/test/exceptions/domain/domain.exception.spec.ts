import { describe, expect, it, vi } from 'vitest';
import { DomainException } from '../../../src/exceptions/domain/domain.exception';
import { AbstractException } from '../../../src/exceptions/abstract.exception';
import { ExceptionCode } from '../../../src/exceptions/exception-code';
import { ApplicationException } from '../../../src/exceptions/application/application.exception';

class OrderCancelledException extends DomainException {
  constructor(orderId: string) {
    super(`Order ${orderId} is cancelled`, ['ORD001']);
  }
}

class Order {
  constructor(
    readonly id: string,
    private cancelled: boolean,
  ) {}

  ship(): void {
    if (this.cancelled) {
      throw new OrderCancelledException(this.id);
    }
  }
}

describe('DomainException', () => {
  it('reports a broken business rule with the domain code DOM000', () => {
    const exception = new DomainException('Stock cannot be negative');

    expect(exception).toBeInstanceOf(AbstractException);
    expect(exception.name).toBe('DomainException');
    expect(exception.code).toBe(ExceptionCode.DomainException);
    expect(exception.description).toBe('Domain Exception (DOM000)');
  });

  it('lets an aggregate reject an operation with its own exception and code', () => {
    const order = new Order('ord-7', true);

    expect(() => order.ship()).toThrow(OrderCancelledException);
    expect(() => order.ship()).toThrow(DomainException);
    expect(() => order.ship()).toThrow('Order ord-7 is cancelled');
    try {
      order.ship();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'OrderCancelledException',
        code: 'ORD001',
        description: 'Domain Exception (DOM000), OrderCancelledException (ORD001)',
      });
    }
  });

  it('lets a use case tell domain failures apart from its own', () => {
    const classify = (error: unknown) =>
      error instanceof DomainException
        ? 'conflict'
        : error instanceof ApplicationException
          ? 'bad request'
          : 'unexpected';

    expect(classify(new OrderCancelledException('ord-7'))).toBe('conflict');
    expect(classify(new ApplicationException('Missing order id'))).toBe('bad request');
    expect(classify(new Error('boom'))).toBe('unexpected');
  });

  it('keeps the error that caused it', () => {
    const cause = new RangeError('quantity out of range');
    const exception = new DomainException('Stock cannot be negative', [], { cause });

    expect(exception.cause).toBe(cause);
  });

  describe('two copies of the package (CJS and ESM builds in the same process)', () => {
    it('an error filter written against one copy recognizes an exception of the other', async () => {
      vi.resetModules();
      const otherCopy = await import('../../../src/exceptions/domain/domain.exception');
      const thrownByOtherCopy = new otherCopy.DomainException('Stock cannot be negative');

      expect(otherCopy.DomainException).not.toBe(DomainException);
      expect(thrownByOtherCopy instanceof DomainException).toBe(true);
      expect(thrownByOtherCopy instanceof AbstractException).toBe(true);
      expect(new DomainException('x') instanceof otherCopy.DomainException).toBe(true);
    });

    it('does not take an application or infrastructure exception of the other copy for a domain one', async () => {
      vi.resetModules();
      const { ApplicationException: OtherApplication } =
        await import('../../../src/exceptions/application/application.exception');
      const { InfrastructureException: OtherInfrastructure } =
        await import('../../../src/exceptions/infrastructure/infrastructure.exception');

      expect(new OtherApplication('x') instanceof DomainException).toBe(false);
      expect(new OtherInfrastructure('x') instanceof DomainException).toBe(false);
    });

    it('recognizes an application subclass of the other copy as a DomainException, but not as this copy of the subclass', async () => {
      vi.resetModules();
      const otherCopy = await import('../../../src/exceptions/domain/domain.exception');
      class OtherOrderCancelledException extends otherCopy.DomainException {
        constructor() {
          super('Order ord-7 is cancelled', ['ORD001']);
        }
      }
      const thrown = new OtherOrderCancelledException();

      expect(thrown instanceof DomainException).toBe(true);
      expect(thrown instanceof OrderCancelledException).toBe(false);
    });
  });
});
