import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;
  readonly reason: string;
  readonly wasPaid: boolean;

  constructor({
    orderId,
    reason,
    wasPaid,
    eventId,
    occurredOn,
    clock,
  }: { orderId: string; reason: string; wasPaid: boolean } & EventMetadata) {
    super({ eventId, occurredOn, clock });
    this.orderId = orderId;
    this.reason = reason;
    this.wasPaid = wasPaid;
  }
}
