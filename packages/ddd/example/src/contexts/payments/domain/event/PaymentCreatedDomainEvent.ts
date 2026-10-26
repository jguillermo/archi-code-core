import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentCreatedDomainEvent extends EventBase {
  static readonly eventName = 'payment.created';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };
  readonly method: string;

  constructor({
    paymentId,
    orderId,
    amount,
    method,
    eventId,
    occurredOn,
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
    method: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.method = method;
  }
}
