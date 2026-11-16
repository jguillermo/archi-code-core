import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentCapturedDomainEvent extends EventBase {
  static readonly eventName = 'payment.captured';

  readonly paymentId: string;
  readonly orderId: string;

  constructor({
    paymentId,
    orderId,
    eventId,
    occurredOn,
  }: { paymentId: string; orderId: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.paymentId = paymentId;
    this.orderId = orderId;
  }
}
