import { describe, expect, it } from 'vitest';
import { EventListener } from '../../../src/application/event/event-listener';
import { ListensTo } from '../../../src/application/event/listens-to';
import { EventBase } from '../../../src/domain/index';
import { ApplicationException } from '../../../src/exceptions/index';

class PaymentCaptured extends EventBase {
  static readonly eventName = 'PaymentCaptured';
  readonly amount = 49.9;
}

class PaymentRefunded extends EventBase {
  static readonly eventName = 'PaymentRefunded';
  readonly reason = 'damaged';
}

@ListensTo(PaymentCaptured, { consumer: 'ship-order-on-payment-captured' })
class ShipOrderOnPaymentCaptured extends EventListener<PaymentCaptured> {
  handle(): void {}
}

@ListensTo(PaymentCaptured, { consumer: 'email-receipt-on-payment-captured' })
class EmailReceiptOnPaymentCaptured extends EventListener<PaymentCaptured> {
  handle(): void {}
}

describe('@ListensTo: the event a listener is subscribed to', () => {
  it('marks the listener with the static eventName of the event class', () => {
    expect(ListensTo.eventOf(new ShipOrderOnPaymentCaptured())).toBe('PaymentCaptured');
  });

  it('names the consumer explicitly, so a minified or repeated class name never changes its queue', () => {
    expect(ListensTo.consumerOf(new ShipOrderOnPaymentCaptured())).toBe(
      'ship-order-on-payment-captured',
    );
    expect(ListensTo.subscriptionOf(new EmailReceiptOnPaymentCaptured())).toStrictEqual({
      eventName: 'PaymentCaptured',
      consumer: 'email-receipt-on-payment-captured',
    });
  });

  it.each([
    ['without options', undefined],
    ['without a consumer', {}],
    ['with a blank consumer', { consumer: '  ' }],
    ['with a consumer that is not text', { consumer: 42 }],
  ])('refuses a listener %s', (_, options) => {
    const decorate = () => {
      // @ts-expect-error the consumer name is required text
      @ListensTo(PaymentCaptured, options)
      class RefundOnPaymentCaptured extends EventListener<PaymentCaptured> {
        handle(): void {}
      }
      return RefundOnPaymentCaptured;
    };
    expect(decorate).toThrow(ApplicationException);
    expect(decorate).toThrow(
      "RefundOnPaymentCaptured needs a consumer name: @ListensTo(<event class>, { consumer: '<name>' })",
    );
  });

  it('lets several listeners subscribe to the same event', () => {
    expect(ListensTo.eventOf(new EmailReceiptOnPaymentCaptured())).toBe('PaymentCaptured');
  });

  it('a listener listens to exactly one event: decorating it twice is refused', () => {
    const decorateTwice = () => {
      @ListensTo(PaymentRefunded, { consumer: 'close-order-on-payment' })
      @ListensTo(PaymentCaptured, { consumer: 'close-order-on-payment' })
      class CloseOrderOnPayment extends EventListener<PaymentCaptured> {
        handle(): void {}
      }
      return CloseOrderOnPayment;
    };
    expect(decorateTwice).toThrow(ApplicationException);
    expect(decorateTwice).toThrow('CloseOrderOnPayment already listens to an event');
  });

  it('a subclass does not inherit the subscription: it declares its own', () => {
    class AuditedShipOrderOnPaymentCaptured extends ShipOrderOnPaymentCaptured {}
    expect(() => ListensTo.eventOf(new AuditedShipOrderOnPaymentCaptured())).toThrow(
      "AuditedShipOrderOnPaymentCaptured needs @ListensTo(<event class>, { consumer: '<name>' })",
    );
  });

  it('refuses to read a listener that was never decorated', () => {
    class LogPayment extends EventListener {
      handle(): void {}
    }
    expect(() => ListensTo.eventOf(new LogPayment())).toThrow(ApplicationException);
  });

  it('keeps the mark under a shared symbol, so the CJS and ESM builds read the same one', () => {
    expect(
      (ShipOrderOnPaymentCaptured as unknown as Record<symbol, string>)[
        Symbol.for('@archi-code/ddd/listens-to.v1')
      ],
    ).toStrictEqual({ eventName: 'PaymentCaptured', consumer: 'ship-order-on-payment-captured' });
  });

  it('refuses at compile time an event class for a listener of another event', () => {
    const decorate = () => {
      // @ts-expect-error a listener of PaymentCaptured cannot listen to PaymentRefunded
      @ListensTo(PaymentRefunded, { consumer: 'mismatch' })
      class Mismatch extends EventListener<PaymentCaptured> {
        handle(event: PaymentCaptured): void {
          void event;
        }
      }
      return Mismatch;
    };
    expect(decorate).not.toThrow();
  });
});
