import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentRejectedDomainEvent extends EventBase {
  static readonly eventName = 'payment.rejected';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };
  readonly reason: string;

  constructor({
    paymentId,
    orderId,
    amount,
    reason,
    eventId,
    occurredOn,
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
    reason: string;
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
    this.reason = reason;
  }
}
