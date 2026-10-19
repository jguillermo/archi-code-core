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

@ListensTo(PaymentCaptured)
class ShipOrderOnPaymentCaptured extends EventListener<PaymentCaptured> {
  handle(): void {}
}

@ListensTo(PaymentCaptured)
class EmailReceiptOnPaymentCaptured extends EventListener<PaymentCaptured> {
  handle(): void {}
}

describe('@ListensTo: the event a listener is subscribed to', () => {
  it('marks the listener with the static eventName of the event class', () => {
    expect(ListensTo.eventOf(new ShipOrderOnPaymentCaptured())).toBe('PaymentCaptured');
  });

  it('lets several listeners subscribe to the same event', () => {
    expect(ListensTo.eventOf(new EmailReceiptOnPaymentCaptured())).toBe('PaymentCaptured');
  });

  it('a listener listens to exactly one event: decorating it twice is refused', () => {
    const decorateTwice = () => {
      @ListensTo(PaymentRefunded)
      @ListensTo(PaymentCaptured)
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
      'AuditedShipOrderOnPaymentCaptured needs @ListensTo(<event class>)',
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
    ).toBe('PaymentCaptured');
  });

  it('refuses at compile time an event class for a listener of another event', () => {
    const decorate = () => {
      // @ts-expect-error a listener of PaymentCaptured cannot listen to PaymentRefunded
      @ListensTo(PaymentRefunded)
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
