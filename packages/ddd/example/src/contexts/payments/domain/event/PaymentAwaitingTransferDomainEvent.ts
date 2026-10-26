import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentAwaitingTransferDomainEvent extends EventBase {
  static readonly eventName = 'payment.awaiting_transfer';

  readonly paymentId: string;
  readonly orderId: string;
  readonly amount: { amount: number; currency: string };

  constructor({
    paymentId,
    orderId,
    amount,
    eventId,
    occurredOn,
    clock,
  }: {
    paymentId: string;
    orderId: string;
    amount: { amount: number; currency: string };
  } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
    this.amount = amount;
  }
}
