import { describe, expect, it, vi } from 'vitest';
import { DomainExceptionCode } from '../../../src/domain/exceptions/domain-exception-code';
import { AbstractException } from '../../../src/shared/exceptions/abstract.exception';

class PaymentGatewayException extends AbstractException {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, ['PAY001'], options);
  }
}

class UnclassifiedException extends AbstractException {
  constructor(message: string) {
    super(message, []);
  }
}

class LayeredException extends AbstractException {
  constructor(message: string) {
    super(
      message,
      [DomainExceptionCode.DomainException, DomainExceptionCode.ValidationFailed],
      {},
      DomainExceptionCode,
    );
  }
}

describe('AbstractException', () => {
  describe('identifying an error in a handler', () => {
    it('is an Error with the class name, so generic handlers and stack traces show it', () => {
      const exception = new PaymentGatewayException('Card declined');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(AbstractException);
      expect(exception.name).toBe('PaymentGatewayException');
      expect(exception.message).toBe('Card declined');
      expect(exception.stack).toContain('PaymentGatewayException');
    });

    it('exposes the most specific code, the last one of its chain', () => {
      expect(new LayeredException('Email is not valid').code).toBe(
        DomainExceptionCode.ValidationFailed,
      );
      expect(new PaymentGatewayException('Card declined').code).toBe('PAY001');
    });

    it('falls back to E000 when it is built without codes', () => {
      const exception = new UnclassifiedException('Something went wrong');

      expect(exception.code).toBe('E000');
      expect(exception.description).toBe('');
    });

    it('describes each known code by its name and an unknown code by the exception name', () => {
      expect(new LayeredException('x').description).toBe(
        'Domain Exception (DOM000), Validation Failed (DOM001)',
      );
      expect(new PaymentGatewayException('x').description).toBe('PaymentGatewayException (PAY001)');
    });
  });

  describe('logging and API responses', () => {
    it('prints a log line with the description, the message and the ISO timestamp', () => {
      vi.useFakeTimers({ now: new Date('2026-03-01T09:30:00.000Z') });
      try {
        const exception = new LayeredException('Email is not valid');

        expect(exception.print()).toBe(
          '[Domain Exception (DOM000), Validation Failed (DOM001)]: Email is not valid, 2026-03-01T09:30:00.000Z',
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('serializes to a plain body for an API response', () => {
      vi.useFakeTimers({ now: new Date('2026-03-01T09:30:00.000Z') });
      try {
        const exception = new PaymentGatewayException('Card declined');

        expect(JSON.parse(JSON.stringify({ error: exception }))).toStrictEqual({
          error: {
            name: 'PaymentGatewayException',
            message: 'Card declined',
            code: 'PAY001',
            description: 'PaymentGatewayException (PAY001)',
            timestamp: '2026-03-01T09:30:00.000Z',
          },
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('records when it was thrown in a timestamp nobody can change afterwards', () => {
      const before = Date.now();
      const exception = new PaymentGatewayException('Card declined');

      expect(exception.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(exception.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      const recorded = exception.timestamp.toISOString();
      exception.timestamp.setFullYear(2000);
      expect(exception.timestamp.toISOString()).toBe(recorded);
      expect(exception.timestamp).not.toBe(exception.timestamp);
    });

    it('keeps the timestamp out of its own enumerable properties, like message and stack', () => {
      expect(Object.keys(new PaymentGatewayException('Card declined'))).not.toContain('timestamp');
    });
  });

  describe('keeping the original error as cause', () => {
    it('keeps the error it wraps, without listing it among its own properties', () => {
      const driverError = new Error('ECONNRESET');
      const exception = new PaymentGatewayException('Card declined', { cause: driverError });

      expect(exception.cause).toBe(driverError);
      expect(Object.keys(exception)).not.toContain('cause');
      expect(Object.getOwnPropertyDescriptor(exception, 'cause')).toStrictEqual({
        value: driverError,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    });

    it('records a cause given explicitly as undefined', () => {
      const exception = new PaymentGatewayException('Card declined', { cause: undefined });

      expect('cause' in exception).toBe(true);
      expect(exception.cause).toBeUndefined();
    });

    it('has no cause when none is given', () => {
      expect('cause' in new PaymentGatewayException('Card declined')).toBe(false);
      expect('cause' in new PaymentGatewayException('Card declined', {})).toBe(false);
    });
  });

  describe('runtimes without Error.captureStackTrace', () => {
    it('is still created with a stack', () => {
      const captureStackTrace = Error.captureStackTrace;
      Reflect.deleteProperty(Error, 'captureStackTrace');
      try {
        const exception = new PaymentGatewayException('Card declined');

        expect(exception.message).toBe('Card declined');
        expect(typeof exception.stack).toBe('string');
      } finally {
        Error.captureStackTrace = captureStackTrace;
      }
    });
  });

  describe('instanceof', () => {
    it('does not recognize plain errors or values that are not errors', () => {
      expect(new Error('boom') instanceof AbstractException).toBe(false);
      const notErrors: unknown[] = [null, 'DOM000'];
      for (const value of notErrors) {
        expect(value instanceof AbstractException).toBe(false);
      }
      expect({ code: 'DOM000' } instanceof AbstractException).toBe(false);
    });

    it('recognizes an exception thrown by another copy of the package', async () => {
      vi.resetModules();
      const otherCopy = await import('../../../src/shared/exceptions/abstract.exception');
      class OtherCopyException extends otherCopy.AbstractException {
        constructor() {
          super('Card declined', ['PAY001']);
        }
      }

      expect(otherCopy.AbstractException).not.toBe(AbstractException);
      expect(new OtherCopyException() instanceof AbstractException).toBe(true);
      expect(new PaymentGatewayException('x') instanceof otherCopy.AbstractException).toBe(true);
    });

    it('a subclass of the application is recognized only natively', async () => {
      vi.resetModules();
      const otherCopy = await import('../../../src/shared/exceptions/abstract.exception');
      class OtherCopyPaymentException extends otherCopy.AbstractException {
        constructor() {
          super('Card declined', ['PAY001']);
        }
      }

      expect(new OtherCopyPaymentException() instanceof PaymentGatewayException).toBe(false);
      expect(new UnclassifiedException('x') instanceof PaymentGatewayException).toBe(false);
    });
  });
});
