import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class PaymentRejectedDomainEvent extends EventBase {
  static readonly eventName = 'payment.rejected';

  readonly orderId: string;
  readonly reason: string;

  constructor({
    orderId,
    reason,
    eventId,
    occurredOn,
  }: { orderId: string; reason: string } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.reason = reason;
  }
}
