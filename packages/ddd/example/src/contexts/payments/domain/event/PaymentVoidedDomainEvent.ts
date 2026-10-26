import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentVoidedDomainEvent extends EventBase {
  static readonly eventName = 'payment.voided';

  readonly paymentId: string;
  readonly orderId: string;

  constructor({
    paymentId,
    orderId,
    eventId,
    occurredOn,
    clock,
  }: { paymentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.paymentId = paymentId;
    this.orderId = orderId;
  }
}
