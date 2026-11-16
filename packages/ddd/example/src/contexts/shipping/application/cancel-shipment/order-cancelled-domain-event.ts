import { EventBase } from '../../../../ddd/domain';
import type { EventMetadata } from '../../../../ddd/domain';

export class OrderCancelledDomainEvent extends EventBase {
  static readonly eventName = 'order.cancelled';

  readonly orderId: string;
  readonly wasPaid: boolean;

  constructor({
    orderId,
    wasPaid,
    eventId,
    occurredOn,
  }: { orderId: string; wasPaid: boolean } & EventMetadata) {
    super({ eventId, occurredOn });
    this.orderId = orderId;
    this.wasPaid = wasPaid;
  }
}
